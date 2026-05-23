---
doc_id: -13
type: "draft"
visibility: "private"
content_type: "threads"
slug: "260522-ai-agent-outcome-operations"
created_at: "2026-05-22"
source: "chatgpt"
source_url: "https://chatgpt.com/share/6a0f9f81-aef8-83ab-a4e0-270b7d69bb21"
title_ko: "AI agent 시대의 돈은 업무 결과를 책임지는 곳에 있다"
domain: "ai-tooling"
key_concepts: ["ai-agent","outcome-operations","vertical-saas","service-bureau","workflow-automation","governance"]
tags: ["draft","threads","ai-tooling","ai-agent","vertical-saas"]
---

`#-13` · AI agent 시대의 돈은 업무 결과를 책임지는 곳에 있다

## 탐색 주제
- 계산기와 컴퓨터가 지식노동 효율을 높였을 때 돈은 어느 구간으로 이동했나
- 단순 계산 대행, 계산기 교육, 계산기 판매 중 무엇이 오래가는 사업이었나
- AI agent가 코딩과 사무 자동화를 싸게 만들면 어떤 사업 구간이 생기나
- 계산기 시대와 AI agent 시대의 대응이 깨지는 지점은 무엇인가
- 고객이 AI coding agent로 내부 툴을 쉽게 복제하는 시대에 vertical SaaS는 충분한가
- "업무 결과를 책임지는 사업"은 순수 SaaS와 순수 대행 사이에서 어떤 형태여야 하나

## 레슨 요약
- 계산기의 발명보다 중요한 것은 계산이 업무 시스템 안으로 흡수된 시점이다. Pascaline 같은 초기 기계보다 Arithmometer, Comptometer, punch-card, mainframe, spreadsheet가 만든 변화는 계산 자체가 아니라 회계, 급여, 보험, 재고, 통계 같은 업무 단위의 재설계였다.
- 단순히 "계산기를 들고 남의 계산을 빨리 해주는 사람"은 과도기에는 돈을 벌 수 있지만 오래가기 어렵다. 도구가 보급되면 계산 자체의 희소성은 사라지고, 데이터 수집, 검증, 보고서화, 책임 소재가 더 큰 병목으로 남는다.
- AI agent 시대의 수익 구간도 단순 대행에서 시작해 service bureau, workflow autopilot, outcome business, governance layer로 이동할 가능성이 높다. 돈은 "AI를 쓴다"가 아니라 "업무가 끝난다"에 붙는다.
- AI agent는 계산기보다 위험하고 넓다. 계산은 비교적 deterministic하지만 agent는 메일 발송, 결제 요청, 고객 응대, 코드 배포처럼 외부 세계를 조작한다. 그래서 검증, 감사, 권한, 거버넌스, 책임 비용이 훨씬 크다.
- 기존 vertical SaaS만으로는 약해질 수 있다. AI coding agent가 내부 툴 제작 비용을 낮추면 고객은 vendor roadmap을 기다리기보다 자기 프로세스에 맞는 시스템을 직접 복제하거나 변형하려 한다.
- 오래가는 형태는 "SW 판매"도 "순수 대행"도 아니라 managed agentic operations에 가깝다. 표준화된 운영 커널 위에 고객별 adapter, human exception desk, eval, audit log, SLA, 지속 개선 루프를 얹어 특정 업무 결과를 책임지는 사업이다.

## 비교표

| 계산기/컴퓨터 시대 | 당시 돈이 된 구간 | AI agent 시대의 대응 | 판단 |
|---|---|---|---|
| 계산기 판매 | 기계 제조사 | 모델/API, agent IDE, coding agent | 도구 판매자. 여기서는 제외 |
| 주판/수작업 계산자 | 숙련 계산 노동 | AI freelancer, prompt worker, coding 대행 | 초기에는 가능하지만 장기 해자 약함 |
| Comptometer 교육 | 계산기 사용 교육 | AI literacy, prompt 교육, agent 교육 | 과도기 사업. 구현·운영과 결합해야 지속 |
| IBM service bureau | 고객 데이터 처리 대행 | AI service bureau, forward-deployed automation team | 강한 초기 사업 구간 |
| Payroll/accounting/billing | 반복·규칙·오류비용 큰 업무 | invoice, claims, RCM, legal ops, procurement, QA 자동화 | 가장 강한 업무 구간 |
| Mainframe time-sharing | 비싼 컴퓨팅 자원 공유 | hosted agent workforce, managed agent ops | infra와 운영이 결합될 때 유효 |
| VisiCalc/Lotus | 개인 업무 모델링 | vibe coding, internal tool generator | 폭발적으로 확산되지만 해자는 data/workflow/distribution |
| ERP/MIS/BPO | 업무 전체 전산화 | agentic workflow OS, outcome-as-a-service | 장기적으로 가장 큰 구간 |

| 복제 요소 | 고객이 복제하기 쉬운가 | 방어력 |
|---|---:|---|
| 화면 UI, 폼, 기본 workflow | 쉬움 | 낮음 |
| 프롬프트와 간단한 리포트 | 쉬움 | 낮음 |
| ERP/API 연동 | 보통 | 중간 |
| 권한·승인·감사로그 | 어려움 | 높음 |
| 예외 처리 데이터셋과 운영 playbook | 어려움 | 높음 |
| cross-customer supplier/regulatory data | 매우 어려움 | 매우 높음 |
| SLA와 실패 복구 책임 | 매우 어려움 | 매우 높음 |

## FAQ

### Q. 계산기는 언제부터 사회를 바꿨나?
- 기계식 계산기의 출발점은 17세기 Pascaline까지 올라가지만, 초기에는 비싸고 희소해서 사회 전체를 크게 바꾸지는 못했다.
- 19세기 후반 Arithmometer와 Comptometer 같은 상업용 계산기가 은행, 회계, 보험, 관공서의 반복 계산을 기계화했다.
- 1930~1970년대에는 punch-card, service bureau, mainframe이 등장하며 "계산"이 "데이터 처리 산업"으로 확장됐다.
- 1970년대 전자식 휴대용 계산기는 슬라이드 룰, 기계식 계산기, 숙련 계산원의 시장을 크게 줄였다.
- 1980년대 PC와 spreadsheet는 계산 능력을 전문가 조직에서 개인 지식노동자의 책상 위로 옮겼다.

### Q. 계산기를 가진 사람이 남의 계산을 대신해주는 사업은 큰돈을 벌었나?
- 단기적으로는 가능했다. 도구가 비싸고 접근성이 낮을 때는 계산 능력 자체가 희소했기 때문이다.
- 장기적으로는 약했다. 계산기는 싸지고 쉬워지고 보급되며, 고객도 곧 직접 도구를 쓰게 된다.
- 계산 결과만 대신 내주는 일은 락인이 약하다. 같은 계산을 더 싸게 해주는 사람이 계속 나온다.
- 더 강한 사업은 계산이 들어간 업무 전체를 맡는 쪽이었다. 급여, 회계, 청구, 재고, 통계, 보험처럼 데이터 입력부터 검증과 보고까지 묶인 업무가 돈이 됐다.
- 교육 사업도 과도기에는 돈을 벌었지만, 도구 사용법은 시간이 지나며 제품 안으로 흡수된다.

### Q. AI agent 시대에는 어디서 돈이 생기나?
- 1순위는 vertical outcome agent다. 고객지원, 보험 청구, 의료 수익관리, 회계 마감, 법무 검토, procurement처럼 완료 단위가 비교적 명확한 업무가 대상이다.
- 2순위는 AI-native BPO 또는 managed agent operation이다. 사람 수를 늘려 매출을 키우는 BPO가 아니라 agent throughput, eval, human review, SLA로 레버리지를 만든다.
- 3순위는 agent control plane이다. 권한 관리, audit log, eval suite, hallucination guardrail, human approval routing, cost control, incident response가 필요해진다.
- 4순위는 workflow data, process mining, enterprise context layer다. agent가 일을 하려면 회사의 실제 업무 흐름과 예외 규칙을 알아야 한다.
- 5순위는 AI software factory와 legacy modernization이다. 낡은 내부 툴, Excel macro, Access DB, 수기 보고서를 agent와 내부 앱으로 바꾸는 시장이다.
- 교육은 돈이 되지만 가장 큰 구간은 아니다. 강한 교육은 ChatGPT 사용법이 아니라 특정 업무 프로세스 redesign, governance, SOP, rollout과 결합된다.

### Q. 계산기 비유가 AI agent에 그대로 맞지 않는 지점은?
- 계산기는 대체로 정답 검증이 쉽다. AI agent의 산출물은 문서, 고객 응대, 코드 변경, 발주 판단처럼 맥락과 책임이 붙는다.
- 계산기는 사용자가 직접 버튼을 누르는 도구에 가까웠지만, agent는 점점 업무를 위임받는 실행자에 가까워진다.
- 계산기 보급은 물리적 기계 구매에 가까웠지만, AI agent는 기존 SaaS, ERP, CRM, IDE 안으로 흡수될 수 있다.
- mainframe service bureau는 고가 장비 접근성 때문에 오래 방어됐지만, AI agent는 cloud software라 고객도 빠르게 직접 시도할 수 있다.
- 그래서 AI agent 사업의 방어력은 모델 사용 능력보다 데이터, workflow ownership, 통합, 권한 설계, 감사 가능성, 결과 책임에서 나온다.

### Q. Vertical SaaS를 만들어 파는 방식은 왜 약해질 수 있나?
- AI coding agent가 좋아질수록 고객은 외부 SaaS의 기능을 보고 내부 프로세스에 맞춰 직접 비슷한 도구를 만들 수 있다.
- 고객은 처음에는 외부 제품을 쓰다가도, 자기 ERP, 승인 체계, supplier master, 예외 규칙과 맞지 않는 부분을 계속 발견한다.
- 과거에는 Lotus 같은 소프트웨어를 사서 쓰는 쪽이 자연스러웠지만, 앞으로는 기능을 이해하면 내부 구현 비용이 크게 낮아질 수 있다.
- 화면, 폼, 기본 workflow, 간단한 리포트, prompt wrapper는 복제 압력이 커진다.
- 따라서 vertical SaaS의 방어력은 "기능을 팔았다"가 아니라 "업무 결과를 반복적으로 더 잘 끝내는 운영 체계가 있다"에서 나와야 한다.

### Q. "업무 결과를 책임지는 사업"은 어떤 형태여야 하나?
- 순수 SaaS처럼 제품만 던져주는 방식으로는 부족하고, 순수 BPO처럼 고객마다 사람이 붙어 처리하는 방식은 scalable하지 않다.
- 중간 형태는 표준화된 agent operating kernel을 갖고, 고객별 프로세스 차이는 adapter와 configuration으로 흡수하는 구조다.
- agent가 정상 케이스를 처리하고, human exception desk가 예외와 고위험 판단을 맡으며, 모든 행동은 audit log와 eval로 남아야 한다.
- 가격도 seat가 아니라 처리량, 완료된 업무, 절감액, 품질 SLA, 리스크 감소 같은 outcome 단위에 가까워질 수 있다.
- 예를 들어 원료구입 자동화라면 "소프트웨어를 팝니다"가 아니라 공급사 커뮤니케이션, 견적 비교, 발주 생성, 승인, 납기 리스크 추적, 규정 준수까지 끝나는 운영 결과를 파는 쪽이다.
- 이 사업의 핵심 자산은 코드가 아니라 업무 데이터, 예외 처리 기록, domain ontology, 평가셋, 통합 connector, 신뢰와 책임 이력이다.

### Q. 어떤 업무가 managed agentic operations에 맞나?
- 좋은 업무는 반복량이 크고, 결과 검증이 가능하며, 예외가 반복되고, 고객별 차이가 parameter 수준인 업무다.
- 오류 비용이 있어야 고객이 돈을 낸다. 급여, 규정 준수, 납기, 품질, 청구, 계약처럼 실패 비용이 있는 업무가 유리하다.
- 기존 outsourcing 또는 hidden labor가 있으면 예산 대체가 쉽다. 새 예산을 만드는 것이 아니라 기존 인력·외주·시간 비용을 대체한다.
- system of record와 연결되는 업무가 좋다. 단순 wrapper가 아니라 ERP, MES, QMS, LIMS, CRM 같은 실제 기록 시스템 위의 운영 레이어가 된다.
- 나쁜 업무는 고객마다 완전히 다르거나, 결과 정의가 모호하거나, 한 번 하고 끝나거나, 고객의 핵심 차별화 영역이라 insource 욕구가 큰 업무다.
- UI 편의성이 전부인 업무와 고객 내부 데이터만 있고 cross-customer learning이 안 되는 업무는 외부 사업자의 해자가 약하다.

<!-- draft-only -->
## To-Do
- ChatGPT 대화 안의 외부 출처 수치와 인용은 발행 전 별도 fact-check 필요.
- 제목 후보: "AI agent 시대의 돈은 업무 결과를 책임지는 곳에 있다", "Vertical SaaS 다음의 managed agentic operations", "도구가 싸질수록 돈은 업무 결과로 이동한다".
- Cosmax 원료구입 예시는 공개 가능 범위와 구체성을 한 번 점검.
- 표가 많아졌으므로 발행 전 본문 길이와 가독성을 한 번 더 줄일지 결정.

원문: [ChatGPT 대화](https://chatgpt.com/share/6a0f9f81-aef8-83ab-a4e0-270b7d69bb21)
<!-- /draft-only -->
