# DISCOVERABILITY_ANALYTICS.md
## 목적
- 검색 노출(SEO/OG/AI 검색 대응)과 사이트 분석(방문/클릭/체류) 기준을 한 문서로 관리한다.
- v1은 구현 부담을 낮추고, v2 이후 도구/이벤트를 쉽게 확장할 수 있게 설계한다.
## v1 원칙
- 검색 노출 품질은 **사이트 구조 + 메타데이터 + 정적 HTML 품질**로 확보
- 분석은 **도구 종속 하드코딩 금지**, 공통 이벤트 스키마를 먼저 정의
- 콘텐츠 발행 자동화 시 SEO/OG 메타도 함께 자동 생성/검증
## 검색 노출 핵심 규칙 (SEO + AI 검색)
1. 크롤 가능한 정적 HTML 기본 (JS 의존 렌더링 최소화)
2. 모든 페이지에 고유 `title` / `description` / `canonical`
3. 한/영 페이지 `hreflang` 대체 관계 명시 (`ko`, `en`, 필요 시 `x-default`)
4. `sitemap.xml` / `robots.txt` 자동 생성 및 루트 배치
5. 포스트 상세는 `Article`(또는 `BlogPosting`) JSON-LD 적용
6. OG/Twitter 메타를 모든 공유 대상 페이지에 생성
7. `noindex`/`nosnippet` 기본 금지(의도된 페이지 제외)
8. 구조화 데이터와 실제 본문 정보는 일치해야 함

## AI 검색 대응 가이드 (ChatGPT/Gemini 등)
- 기본 원칙: **좋은 웹 SEO가 AI 검색 노출의 기본**
- 특히 중요:
  - 명확한 제목/요약/헤딩 구조
  - 안정적 URL + canonical + hreflang
  - 출처 링크(특히 What I read의 arXiv 원문 링크)
  - robots 정책의 의도적 관리(검색 크롤러 차단 실수 금지)
- v1 기본 정책: OpenAI/Google 관련 크롤러 정책은 허용, 향후 `robots.txt`에서 분리 제어 가능

## 페이지별 메타데이터 규칙
### 공통 페이지 (Home / About / 목록)
- `title`, `description`, `canonical`
- `og:title`, `og:description`, `og:url`, `og:image`
- `og:type=website`
- `lang` + `hreflang`
- robots 기본 `index,follow`

### 포스트 상세 (Write / Read 공통 템플릿)
- 공통: 위 항목 + `og:type=article`
- 권장: `article:published_time`, `article:modified_time`, `article:tag`
- What I read 추가: 원문 링크(arXiv/출처) 표시, 가능 시 `citation`/`sameAs`

## 구조화 데이터 (JSON-LD) 규칙
- v1 기본 타입:
  - 포스트 상세: `Article` 또는 `BlogPosting`
  - About: `Person`
  - Home: 필요 시 `WebSite`
- 최소 필드: `headline`, `description`, `datePublished`, `dateModified`, `author`, `inLanguage`, `image`, `mainEntityOfPage`
- 한/영 페이지는 `inLanguage`를 각각 명시

## sitemap / robots / hreflang 규칙
- `sitemap.xml` 빌드 시 자동 생성 (canonical URL 기준)
- `lastmod`는 의미 있는 수정에만 갱신
- `robots.txt`에 sitemap 경로 명시
- hreflang은 자기 자신 + 대응 언어 페이지 상호 참조
- 대응 번역이 없으면 hreflang 링크를 억지로 만들지 않음

## OG 이미지 / 커버 연동
- 기본 OG 이미지 소스는 포스트 `cover.webp`
- 권장 크기: `1200x630`
- 없으면 사이트 기본 OG 이미지 fallback
- 커버 톤은 `DESIGN_SYSTEM.md` 준수 (흰/회색 기반 + Teal 절제)

## 분석 도입 전략 (GA4보다 쉬운 기본안 + 확장성)
### v1 추천 기본안
- **Vercel Web Analytics** 우선 도입 (Vercel 배포와 통합 쉬움)
- 목적: 일일 방문자, 상위 페이지, 리퍼러, 기본 트래픽 흐름 확인

### 체류시간 지표가 초기에 꼭 필요하면 (대안)
- **Plausible** 검토 (GA4보다 단순, custom events + visit duration 활용 가능)
- 단, v1 우선순위는 도구 확정보다 **공통 이벤트 스키마 고정**

## 공통 이벤트 스키마 (도구 독립)
- 앱 코드에서 직접 특정 분석도구 API 호출 금지
- `track(eventName, payload)` 래퍼만 사용
- 공통 필드:
  - `event_name`
  - `page_type` (`home|write_index|read_index|post_detail|about`)
  - `content_id` (포스트일 때)
  - `content_kind` (`write|read|video|none`)
  - `locale` (`ko|en`)
  - `source` (`list_card|hero|footer|inline_link` 등)

## v1 추적 이벤트 최소 세트
- `page_view` (provider 기본 pageview 사용 가능)
- `content_card_click`
- `content_outbound_click` (arXiv/YouTube 등)
- `language_switch`
- `social_icon_click`

## 읽는 시간/체류시간 규칙
- **추정 읽는 시간**: 빌드 시 계산하여 콘텐츠 메타에 저장
- **실제 체류시간**: 분석 도구 지표로 수집 (v2 고도화)
- v1 목표 지표: 일일 방문자 / 콘텐츠별 클릭 수 / 상위 페이지 / 리퍼러 / (가능 시) 방문 지속 시간

## 배포/발행 검증 체크
- title/description/canonical/OG 메타 존재
- 포스트 JSON-LD 유효성 확인
- hreflang 쌍 일치(ko↔en)
- sitemap/robots 생성 확인
- 분석 스크립트는 프로덕션 환경에서만 주입
- 이벤트 이름/필드가 공통 스키마 준수
