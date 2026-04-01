# Social Media 운영 가이드

> 실행은 `/post-share` 커맨드(`.claude/commands/post-share.md`) 사용.

## 플랫폼 현황

| 플랫폼 | 언어 | 토큰 만료 |
|--------|------|-----------|
| Facebook Page | 한국어 | 없음 (Long-lived Token) |
| Threads | 한국어 | 60일 |
| LinkedIn | 영어 | 60일 |
| X (Twitter) | 영어 | 없음 (OAuth 1.0a) |
| Bluesky | 영어 | App Password (만료 없음) |

## 토큰 갱신

### Facebook Page Access Token (만료 없음)
1. [Meta for Developers](https://developers.facebook.com/) → Graph API Explorer
2. User Token → Get Page Access Token → Long-lived token 교환
3. `FACEBOOK_PAGE_ACCESS_TOKEN` 업데이트

### Threads (60일)
1. Meta for Developers → Threads API → Generate Token
2. Short-lived → Long-lived 교환: `GET https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret={APP_SECRET}&access_token={TOKEN}`
3. `THREADS_ACCESS_TOKEN` + `THREADS_TOKEN_CREATED` 업데이트

### LinkedIn (60일)
1. [LinkedIn Developer Portal](https://developer.linkedin.com/) → OAuth 2.0 tools → Request access token
2. `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_TOKEN_CREATED` 업데이트

### X — OAuth 1.0a (만료 없음)
1. [X Developer Portal](https://developer.twitter.com/) → Keys and Tokens
2. `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`
