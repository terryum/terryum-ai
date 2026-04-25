---
slug: 260425-kaist-retry-storm
source: from-terry
content_type: memos
visibility: public
title: Vercel 폭주, 범인은 KAIST의 어떤 분이었다
tags:
  - memos
  - vercel
  - cloudflare
  - retry-storm
  - llm-agent
  - postmortem
  - infra-cost
---

> 이전 글 [[260419-vercel-quiet-bill]] 이 "왜 청구서가 부풀었나(구조 문제)"를 다뤘다면, 이 글은 "그날 정확히 무엇이 일어났고 내 책임은 무엇이었나(개별 사건의 복기)"를 다룬다.

## TL;DR

- 4월 9–12일, KAIST 단일 IP에서 **약 5천만 edge requests**가 단일 서베이 사이트의 깨진 이미지 3개에 retry storm으로 들어옴
- 트리거는 **두 개의 결함이 겹친 것**: (1) figure 경로가 옛 폴더 구조를 가리키는데 파일은 새 flat 구조로 옮겨져 404, (2) `<img onerror="this.src='{src}'">` 패턴이 헤드리스 환경에서 무한 재발화
- 외부 자동화(LLM agent의 browsing tool 또는 헤드리스 크롤러)가 그 두 결함 위에서 4일간 루프를 돔
- 청구서로 알게 됐다 — **사고가 끝날 때까지 내가 인지조차 못한 게 가장 큰 문제**
- 사후 조치: 코드 단일 line(`this.onerror=null`) 추가, validator에 figure 경로 검증, Cloudflare로 이전, Access OTP로 그 IP 정체 추적 셋업, billing/anomaly 알림
- KAIST 분, 보고계시다면 연락주세요. 밥이라도 한번 사주시죠. 

## 무슨 일이 있었나

평소 Vercel 청구서는 한 자릿수 달러였는데 4월 어느 날 비정상 청구액이 찍혔다. 분석 요청을 보냈더니 답이 왔다.

> "I've taken a look at the traffic from April 8th → April 12th and do indeed see the spike you are referring to. After digging into the traffic, it appears that these requests originate from Korea Advanced Institute of Science and Technology and the majority of the requests are to image URLs. All these requests occur from the same IP address with the same referrer URL `https://survey-robot-hand-tactile-sensor.vercel.app/ko/ch10.html`."

단일 IP, 일관된 UA, 같은 referrer. 분산 공격이 아니라 **한 사람(또는 한 자동화 도구)이 같은 페이지의 같은 이미지 3개**를 4일간 두드린 시그니처. Vercel도 "DDoS는 아니다"라고 진단.

평균 초당 ~150회. 한 이미지당 약 1,700만 회. **사람 손이나 정상 브라우저로는 불가능한 숫자.**

## 왜 폭주했나 — 두 결함의 곱

### 결함 1: figure 경로가 사라진 파일을 가리킴

서베이가 standalone 시기에 figure를 `assets/figures/ch10/fig_10_X_<slug>.png` 같이 챕터별 서브폴더에 두었다. 모노레포 통합 직전에 flat naming(`ch10_<slug>_fig<N>.png`)으로 표준을 바꾸면서 파일은 옮겼는데 **그 시점의 standalone 빌드가 가지고 있던 옛 ch10.html은 옛 경로를 그대로 들고 있었다.** 결과: 모든 이미지 요청이 404.

### 결함 2: onerror 자기 루프

`shared/build_site.py:479`의 한 줄.

```python
onerror="this.src='{src}'"
```

dark-mode 이미지가 없을 때 light-mode로 fall back하려는 의도였는데, **dark도 light도 둘 다 깨진 상황**에서 헤드리스 환경은 그 onerror를 멈추지 않고 다시 발화시켰다. 일반 브라우저는 동일 src 재발화를 자체 가드하는데, 헤드리스 Chromium 또는 일부 LLM agent의 browser tool은 그 가드가 약하거나 없다.

### 결함 위에 들어온 외부 자동화

KAIST의 누군가가 그 챕터(embodiment retargeting)를 자동화 도구에 던졌을 것으로 추정한다. "이 페이지 요약해줘" 또는 "여기 figure 다 다운받아줘" 같은 작업을. 도구는 페이지를 헤드리스로 열고 이미지를 fetch했는데 모두 404. retry policy가 종료 조건 없이 계속 돌았다. 4월 12일경 자연 종료된 건 사용자가 노트북을 닫았거나 세션이 timeout된 듯.

**악의는 없어 보인다.** 자동화가 막혔는데 막힌 줄 모르고 계속 시도한 전형적 패턴. 다만 그 사람의 무지(또는 불운)가 내 청구서에 그대로 적힌다는 게 새로운 시대의 비용 구조.

## 내 잘못

청구서가 비정상 액수가 될 때까지 내가 인지하지 못한 건 운이 아니라 설계의 부재였다. 네 가지를 짚는다.

### 1. 마이그레이션을 깔끔히 끝내지 않았다

flat naming으로 바꾸면서 파일은 옮겼지만 **옛 경로를 가진 deploy가 여전히 살아있는지 확인 안 했다.** 빌드 단계에서 "이 페이지가 참조하는 모든 figure가 실제로 존재하는가"를 검증하는 룰이 없었다. 그게 있었다면 4/8 deploy 자체가 막혔을 것.

### 2. onerror에 가드를 두지 않았다

`onerror="this.src='{src}'"`는 의도가 맞아도 fail-safe하지 않다. **첫 fail 후 onerror를 null로 만드는 한 줄이 빠져 있었다.** 정상 브라우저에서만 테스트했고 헤드리스 환경의 동작은 검증 안 함.

### 3. 비용에 대한 자동 차단 장치가 없었다

Vercel은 결제 수단이 등록되어 있으면 한도 없이 청구가 누적된다. **spend limit, billing alert, daily threshold 알림 어느 것도 셋업해 두지 않았다.** Pro 플랜의 결제 수단 등록은 "내가 신뢰하는 한도까지만 쓴다"는 약속을 자동화하지 않으면 그냥 무방비 상태다.

### 4. 모니터링이 사실상 없었다

트래픽 anomaly가 며칠 지속되는 동안 메일 한 통도 안 왔다. **청구서가 알림이었다.** 청구 주기는 한 달이라 길게는 30일 늦은 신호다. 내가 직접 anomaly를 볼 수 있는 채널이 없었다는 건 모니터링을 안 한 거나 마찬가지.

이 넷 중 하나라도 있었으면 사고는 시작도 못 했거나, 시작 후 1시간 안에 끊겼을 것이다.

## 지금이라도 한 조치

층을 쌓았다. 한 층이 뚫려도 다음이 막도록.

### 코드 측

- **`shared/build_site.py:479` onerror 단발화** — `this.onerror=null;this.src='{src}'`. 첫 fail 후 재발화 차단. 한 image당 최대 2 requests.
- **`shared/validate.py`에 figure 검증 강화** — `assets/figures/ch{N}/` 서브폴더 등장 시 빌드 fail. 본문 참조 figure가 디스크에 존재하는지 file existence check.
- **GitHub Actions PR validate** — 위 룰들이 PR 단계에서 자동 발화. 깨진 경로가 main 도달 자체 차단.

### 인프라 측 (Vercel → Cloudflare 이전 + Cloudflare 보호)

- **Cloudflare Pages로 이전** — egress 무료. 같은 사고가 또 나도 청구서 변동 0.
- **WAF Rate Limiting Rule** — 같은 IP가 `/assets/`에 10초당 100회 초과 시 차단.
- **Bot Fight Mode** — 알려진 bad bot UA 자동 challenge.
- **AI Bot Block + AI Labyrinth** — GPTBot/ClaudeBot/PerplexityBot 등 LLM 크롤러 자동 차단 + 우회 봇은 가짜 미로 페이지로 유도해 자원 갈아먹기. **이번 사고가 LLM agent였을 가능성에 가장 직접적인 답.**
- **Browser Integrity Check + Email Obfuscation + Polyfill 자동 교체** — 일반 위생.
- **Security.txt + robots.txt 콘텐츠 신호** — AI 학습 거부 의사 명시.
- **DDoS L7 알림 + Billing $10 알림** — 청구서가 아닌 메일로 즉시 인지.

## 그래서 뭐가 바뀌었나

같은 사고가 내일 다시 일어나도:
- **금전적 손실 0** — Cloudflare egress 무료
- **트래픽 자체가 1분 안에 차단** — Rate Limit + Bot Fight Mode + AI Bot Block 어느 한 층이라도 잡음
- **즉시 인지** — DDoS L7 알림이 메일로 옴
- **재발 자체가 어려움** — figure 경로 깨짐은 PR 단계에서 차단, onerror self-loop는 코드에서 제거

이전과 달라진 건 "강한 방어막"이 아니라 **방어막이 존재한다는 것 자체**다. 이전엔 정말 아무것도 없었다.

## 교훈 — 정적 사이트도 비용 폭주 가능하다는 것

오랫동안 정적 사이트 = 안전한 비용이라고 믿었다. HTML/CSS/JS 한 묶음이고 서버 코드도 없으니까. 틀린 가정이었다.

- 정적 자원도 **edge request count**로 과금되는 호스팅에서는 봇 한 대가 5천만 회를 두드리면 5천만 회의 비용이 그대로 발생한다.
- 자동화 도구(특히 LLM agent의 browsing tool)는 **종료 조건 없는 retry**를 흔히 한다. 의도와 무관하게.
- "정적 사이트라 안전" → "egress 비용 계량기가 어디에 있는가"로 질문이 바뀌어야 한다.
- Cloudflare가 무료 unmetered egress를 제공하는 건 그저 가격 정책이 아니라 **이런 종류의 사고에 대한 구조적 보험**이다.

## 더 큰 그림

이번 사고의 진짜 메시지는 KAIST의 누군가를 탓하는 게 아니다. **자동화가 보편화된 시대에는 의도 없는 사고가 일상이 된다**는 것. 사람의 실수보다 기계의 무지(또는 잘못 설계된 retry policy)가 더 자주, 더 크게 비용을 만든다.

그래서 모든 공개 자산은 **계량기 앞에서 끊어주는 인프라 + 자동화 친화적 fail-safe + 자동 알림 + 청구 자동 차단** 네 가지를 기본 가정으로 깔고 시작해야 한다. 이번 사고가 비싼 수업료였다. (하지만 KAIST분 이 글 보시면 연락 주시고 저 밥은 한번 사주시길... 밥값이 참 비쌌습니다..T.T)

## 관련 글

- [[260419-vercel-quiet-bill]] — 같은 사고를 비용 구조 관점에서 다룬 글. 이 글이 "사건"이라면 그 글은 "구조".
