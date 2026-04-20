---
doc_id: -4
type: "draft"
visibility: "private"
content_type: "memos"
slug: "260420-one-day-recovery"
created_at: 2026-04-20
source_memos: ["@vault/From Terry/Drafts/Blog_Source.md"]
domain: ""
subfields: []
key_concepts: []
tags: []
taxonomy_primary: ""
taxonomy_secondary: []
relations: []
---

`#-4` · 하루 만에 고친 SkinChat 인프라 부채

## TL;DR

- 비개발자 혼자 하루 세션으로 SkinChat·SkinLog 인프라 부채 7건 해소
- 응답 속도: **영어 −37%, 한국어 −32%**
- **90일+ 꺼져 있던** 스킨톡 AI 자동답변 복구 → 미응답 105건 처리
- 보안 구멍 2개 봉쇄 — RLS `FOR ALL USING (true)` 5개 + service_role 브라우저 번들 노출
- Supabase 2 프로젝트 → 1개 통합 (이중 비용 일부 제거)

## 스코프

| 영역             | 작업                                              |
| -------------- | ----------------------------------------------- |
| SkinChat 응답 속도 | Azure OpenAI → OpenAI 직접 + 키워드 분류기 + DeepL 제거   |
| Supabase       | 2 프로젝트 merge (프로젝트 수십, 피드백 수백, 기타 메타 테이블 일부)    |
| 스킨톡 봇          | Lambda env `COMMENTS_API` 교체 + 105건 소급 invoke   |
| 보안             | RLS 5 정책 DROP + VITE 키 anon으로 교체                |
| 프론트엔드          | Bitbucket → GitHub 이전 + Amplify 소스 전환           |
| 도메인 통합         | skinlog.ai → `*.artlab.ai` 서브도메인 (만료 리스크 선제 차단) |
| UX             | 텍스트 드래그 복사 (`user-select: text`)                |

## 배포 수치

- 수정한 Lambda env: 35개 (dev 18 + prod 17)
- 배포된 함수: 25개 (핵심 API Lambda + 채팅 API Lambda)
- 실제 배포 소요: 148s + 70s
- 스모크 통과: 헬스체크 + 프로젝트 엔드포인트 200

## 응답 지연 실측

| | Before | After | Δ |
|---|---|---|---|
| EN | 6.79s | 4.26s | −37% |
| KO | 7.39s | 5.00s | −32% |
| HTTP 500 (DeepL 만료) | 간헐 | 0 | — |

## 정비 항목 — 범주별 요약

7건의 부채를 묶으면 네 범주다.

**성능 (응답 속도)**
Azure OpenAI 프록시 경유를 걷어내고 OpenAI 직접 호출 + 입력 키워드 분류기 + 만료 임박 DeepL 제거. 이중 번역 경로와 외부 의존이 6~7초 지연의 핵심이었음.

**보안 (2건 봉쇄)**
- RLS 정책이 `FOR ALL USING (true)`로 설정돼 anon 키만으로 전 테이블 접근 가능 → 5개 정책 교체
- `VITE_` 접두어로 주입된 service_role 키가 클라이언트 번들에 평문 inline → anon 키로 교체 + 서버 측 전용화

**인프라 이전·통합**
- Supabase 2 프로젝트 → 1개로 merge (이중 비용 일부 제거)
- 브랜드 도메인(skinlog.ai) 만료 리스크 → `*.artlab.ai` 서브도메인 선제 이전 + 301 리다이렉트
- Bitbucket → GitHub 이전 + Amplify 소스 전환

**장기 장애 복구 (스킨톡 봇)**
Lambda env 1개가 sunset된 도메인을 가리킨 채 90일간 조용히 실패. env 교체 후 포스팅 112건 중 미응답 105건 백필 (35~40분, 에러 0).

## 분업 — 무엇을 AI가 하고, 무엇을 사람이 판단했나

- **AI 실행**: 흩어진 repo 수십 개 통합 읽기, 부하 원인·영향 반경 분석, env 패치, 정책 rewrite, 배포 스크립트 작성, 백필 코드 작성·실행
- **사람 판단**: 스키마 영향 여부, 외부 승인 경계(스토어·ACM 등), 백필 전략·순서, 보안 정책 허용 범위, 이전 순서(빌드 아티팩트 의존성)
- **안전망**: 시크릿 누출 차단 훅 + 외부 repo exfiltration 차단 + commit-단 자동 리뷰 (묵은 RLS 구멍도 이 채널로 검출)

## 판단 기준 — 무엇이 하루 세션으로 되고, 무엇이 안 되나

"하루 AI 세션"과 "별도 트랙(다른 날/다른 팀/외부 승인)"을 가르는 축은 세 가지다.

| 축 | 하루 세션으로 끝남 | 별도 트랙으로 빼야 함 |
|---|---|---|
| **스키마 영향** | env·설정·정책 교체 (schema-safe) | DB 마이그레이션, 인증 플로우 변경 |
| **외부 승인** | 자체 배포로 끝남 | 앱 스토어 재제출, 도메인·인증서 발급 대기 |
| **조직 경계** | 개인·단일 팀 범위 | IAM 전면 재설계, 타 팀이 관리하는 레거시 아티팩트 이전 |

세 축 중 **하나라도 걸리면 별도 트랙**이다. 이번 세션의 7건은 세 축 모두 통과했기에 하루 안에 닫혔고, "남은 일"의 4건은 각각 한 축 이상에 걸려 있다.

## ROI

- **투입**: 하루 세션 (판단은 사람, 실행은 AI)
- **산출**: 미룬 이슈 7건 해소 + 수개월짜리 장애 2건 (DeepL 500, 스킨톡 봇) 복구

## 관련 글

- [[260420-debt-changes-hands]] — 이번 정비가 보여주는 것: 개발 부채의 주인이 창업자에게 돌아왔다
