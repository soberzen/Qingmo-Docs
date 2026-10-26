package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"doc-server/pkg"

	"github.com/redis/go-redis/v9"
)

const (
	defaultKeepTTL  = 30 * 24 * time.Hour
	keyCacheTTL     = 15 * time.Minute
	keyStoreTimeout = 5 * time.Second
	maxInitAttempts = 3
)

const (
	kidCollisionMarker = "RSA_KID_COLLISION"
	noActiveKeyMarker  = "RSA_NO_ACTIVE_KEY"
)

type RSAKeyStore struct {
	rdb       *redis.Client
	keepTTL   time.Duration
	cache     sync.Map // cachedKey -> *cachedKeyPair
	sweepMu   sync.Mutex
	nextSweep atomic.Int64
}

type cachedKey struct {
	tokenType TokenType
	kid       string
}

type cachedKeyPair struct {
	pair      *pkg.KeyPair
	expiresAt time.Time
}

var initRSAKeyScript = redis.NewScript(`
local current = redis.call("GET", KEYS[1])
if current then
	return current
end
if redis.call("EXISTS", KEYS[2]) == 1 then
	return redis.error_reply("RSA_KID_COLLISION")
end
local ttl = tonumber(ARGV[3])
if not ttl or ttl < 1 then
	return redis.error_reply("RSA_INVALID_KEEP_TTL")
end
redis.call("SET", KEYS[1], ARGV[1])
redis.call("SET", KEYS[2], ARGV[2], "PX", ttl)
return ARGV[1]
`)

var rotateRSAKeyScript = redis.NewScript(`
local current = redis.call("GET", KEYS[1])
if not current then
	return redis.error_reply("RSA_NO_ACTIVE_KEY")
end
if current ~= ARGV[1] then
	return current
end
if redis.call("EXISTS", KEYS[2]) == 1 then
	return redis.error_reply("RSA_KID_COLLISION")
end
local ttl = tonumber(ARGV[4])
if not ttl or ttl < 1 then
	return redis.error_reply("RSA_INVALID_KEEP_TTL")
end
redis.call("SET", KEYS[2], ARGV[3], "PX", ttl)
redis.call("SET", KEYS[1], ARGV[2])
return ARGV[2]
`)

var loadRSAKeyScript = redis.NewScript(`
local data = redis.call("GET", KEYS[1])
if not data then
	return {false, -2}
end
return {data, redis.call("PTTL", KEYS[1])}
`)

func keyPath(t TokenType, kid string) string {
	return fmt.Sprintf("auth:rsa:%s:%s", t, kid)
}

func activePath(t TokenType) string {
	return fmt.Sprintf("auth:rsa:active:%s", t)
}

func NewRSAKeyStore(rdb *redis.Client, keepTTL time.Duration) *RSAKeyStore {
	if keepTTL <= 0 {
		keepTTL = defaultKeepTTL
	}

	if remainder := keepTTL % time.Millisecond; remainder != 0 {
		keepTTL += time.Millisecond - remainder
	}
	return &RSAKeyStore{
		rdb:     rdb,
		keepTTL: keepTTL,
	}
}

func (s *RSAKeyStore) cacheTTL() time.Duration {
	return min(keyCacheTTL, s.keepTTL)
}

func (s *RSAKeyStore) sweepExpired(now time.Time) {
	if !s.sweepMu.TryLock() {
		return
	}
	defer s.sweepMu.Unlock()

	next := s.nextSweep.Load()
	if next != 0 && now.UnixNano() < next {
		return
	}

	s.cache.Range(func(key, value any) bool {
		entry, ok := value.(*cachedKeyPair)
		if !ok {
			s.cache.CompareAndDelete(key, value)
			return true
		}
		if !now.Before(entry.expiresAt) {
			s.cache.CompareAndDelete(key, entry)
		}
		return true
	})
	s.nextSweep.Store(now.Add(s.cacheTTL()).UnixNano())
}

func (s *RSAKeyStore) getCached(key cachedKey, now time.Time) (*pkg.KeyPair, bool) {
	s.sweepExpired(now)
	value, ok := s.cache.Load(key)
	if !ok {
		return nil, false
	}
	entry, ok := value.(*cachedKeyPair)
	if !ok {
		s.cache.CompareAndDelete(key, value)
		return nil, false
	}
	if !now.Before(entry.expiresAt) {
		s.cache.CompareAndDelete(key, entry)
		return nil, false
	}
	return entry.pair, true
}

func isKidCollision(err error) bool {
	return err != nil && strings.Contains(err.Error(), kidCollisionMarker)
}

func isNoActiveKey(err error) bool {
	return err != nil && strings.Contains(err.Error(), noActiveKeyMarker)
}

func (s *RSAKeyStore) get(ctx context.Context, t TokenType, kid string) (*pkg.KeyPair, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	key := cachedKey{tokenType: t, kid: kid}
	started := time.Now()
	if pair, ok := s.getCached(key, started); ok {
		return pair, nil
	}

	result, err := loadRSAKeyScript.Run(ctx, s.rdb, []string{keyPath(t, kid)}).Slice()
	if err != nil {
		return nil, fmt.Errorf("load RSA key pair for %s:%s: %w", t, kid, err)
	}
	if len(result) != 2 {
		return nil, fmt.Errorf("invalid RSA key response for %s:%s", t, kid)
	}
	if result[0] == nil {
		return nil, fmt.Errorf("no RSA key pair for %s:%s: %w", t, kid, redis.Nil)
	}

	data, dataOk := result[0].(string)
	ttlMillis, ttlOk := result[1].(int64)
	if !dataOk || !ttlOk {
		return nil, fmt.Errorf("invalid RSA key response for %s:%s", t, kid)
	}

	if ttlMillis < 0 || ttlMillis == 0 {
		return nil, fmt.Errorf("expired RSA key pair for %s:%s: %w", t, kid, redis.Nil)
	}

	var pair pkg.KeyPair
	if err := json.Unmarshal([]byte(data), &pair); err != nil {
		return nil, fmt.Errorf("decode RSA key pair for %s:%s: %w", t, kid, err)
	}
	if pair.Kid != kid || pair.PrivatePEM == "" || pair.PublicPEM == "" {
		return nil, fmt.Errorf("invalid RSA key pair for %s:%s", t, kid)
	}

	lifetime := s.cacheTTL()
	if ttl := time.Duration(ttlMillis) * time.Millisecond; ttl < lifetime {
		lifetime = ttl
	}
	expiresAt := started.Add(lifetime)
	if !time.Now().Before(expiresAt) {
		return nil, fmt.Errorf("RSA key load exceeded cache lifetime for %s:%s", t, kid)
	}
	s.cache.Store(key, &cachedKeyPair{pair: &pair, expiresAt: expiresAt})
	return &pair, nil
}

func (s *RSAKeyStore) GetContext(ctx context.Context, t TokenType, kid string) (*pkg.KeyPair, error) {
	ctx, cancel := context.WithTimeout(ctx, keyStoreTimeout)
	defer cancel()
	return s.get(ctx, t, kid)
}

func (s *RSAKeyStore) Get(ctx context.Context, t TokenType, kid string) (*pkg.KeyPair, error) {
	return s.GetContext(ctx, t, kid)
}

func (s *RSAKeyStore) ActiveKeyContext(ctx context.Context, t TokenType) (string, *pkg.KeyPair, error) {
	ctx, cancel := context.WithTimeout(ctx, keyStoreTimeout)
	defer cancel()

	if err := ctx.Err(); err != nil {
		return "", nil, err
	}

	kid, err := s.rdb.Get(ctx, activePath(t)).Result()
	switch {
	case err == nil:
		pair, loadErr := s.get(ctx, t, kid)
		if loadErr == nil {
			return kid, pair, nil
		}
		if !errors.Is(loadErr, redis.Nil) {
			return "", nil, loadErr
		}
		return s.Rotate(ctx, t)
	case errors.Is(err, redis.Nil):
		return s.initialize(ctx, t)
	default:
		return "", nil, fmt.Errorf("get active RSA kid for %s: %w", t, err)
	}
}

func (s *RSAKeyStore) loadActivePair(ctx context.Context, t TokenType, kid string) (string, *pkg.KeyPair, error) {
	pair, err := s.get(ctx, t, kid)
	if err != nil {
		return "", nil, err
	}
	return kid, pair, nil
}

func generateRSAKeyCandidate() (*pkg.KeyPair, []byte, error) {
	pair, err := pkg.GenerateKeyPair()
	if err != nil {
		return nil, nil, fmt.Errorf("generate RSA key pair: %w", err)
	}
	if pair == nil || pair.Kid == "" {
		return nil, nil, fmt.Errorf("generated RSA key pair has empty kid")
	}
	data, err := json.Marshal(pair)
	if err != nil {
		return nil, nil, fmt.Errorf("marshal RSA key pair: %w", err)
	}
	return pair, data, nil
}

func (s *RSAKeyStore) initialize(ctx context.Context, t TokenType) (string, *pkg.KeyPair, error) {
	if err := ctx.Err(); err != nil {
		return "", nil, err
	}
	var lastErr error
	for range maxInitAttempts {
		if err := ctx.Err(); err != nil {
			return "", nil, err
		}
		pair, data, err := generateRSAKeyCandidate()
		if err != nil {
			return "", nil, err
		}
		kid, err := initRSAKeyScript.Run(
			ctx, s.rdb,
			[]string{activePath(t), keyPath(t, pair.Kid)},
			pair.Kid, string(data), s.keepTTL.Milliseconds(),
		).Text()
		if err != nil {
			if isKidCollision(err) {
				lastErr = err
				continue
			}
			return "", nil, fmt.Errorf("initialize RSA key for %s: %w", t, err)
		}
		return s.loadActivePair(ctx, t, kid)
	}
	return "", nil, fmt.Errorf("initialize RSA key for %s after %d attempts: %w", t, maxInitAttempts, lastErr)
}

func (s *RSAKeyStore) Rotate(ctx context.Context, t TokenType) (string, *pkg.KeyPair, error) {
	ctx, cancel := context.WithTimeout(ctx, keyStoreTimeout)
	defer cancel()

	if err := ctx.Err(); err != nil {
		return "", nil, err
	}

	oldKid, err := s.rdb.Get(ctx, activePath(t)).Result()
	if err != nil && !errors.Is(err, redis.Nil) {
		return "", nil, fmt.Errorf("get active RSA kid for %s: %w", t, err)
	}
	if errors.Is(err, redis.Nil) {
		return s.initialize(ctx, t)
	}

	var lastErr error
	for range maxInitAttempts {
		if err := ctx.Err(); err != nil {
			return "", nil, err
		}
		pair, data, err := generateRSAKeyCandidate()
		if err != nil {
			return "", nil, err
		}
		kid, err := rotateRSAKeyScript.Run(
			ctx, s.rdb,
			[]string{activePath(t), keyPath(t, pair.Kid)},
			oldKid, pair.Kid, string(data), s.keepTTL.Milliseconds(),
		).Text()
		if err != nil {
			if isKidCollision(err) {
				lastErr = err
				continue
			}
			if isNoActiveKey(err) {
				return s.initialize(ctx, t)
			}
			return "", nil, fmt.Errorf("rotate RSA key for %s: %w", t, err)
		}

		return s.loadActivePair(ctx, t, kid)
	}
	return "", nil, fmt.Errorf("rotate RSA key for %s after %d attempts: %w", t, maxInitAttempts, lastErr)
}

func (s *RSAKeyStore) Revoke(ctx context.Context, t TokenType, kid string) error {
	ctx, cancel := context.WithTimeout(ctx, keyStoreTimeout)
	defer cancel()

	if err := ctx.Err(); err != nil {
		return err
	}

	if err := s.rdb.Del(ctx, keyPath(t, kid)).Err(); err != nil {
		return fmt.Errorf("revoke RSA key for %s:%s: %w", t, kid, err)
	}
	s.cache.Delete(cachedKey{tokenType: t, kid: kid})
	return nil
}
