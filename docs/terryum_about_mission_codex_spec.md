# terryum.ai Personal Brand / About 개편 개발 명세

> 대상 저장소: `terryum/terryum-ai`<br />
> 목표: 현재의 제조 중심 소개를 상위 미션인 **“AI와 Robotics의 최전선을 일상의 현실로 바꾸는 연구자이자 창업가”**로 재정렬하고, 상세한 미션·원칙을 담는 영구 페이지를 추가한다.

---

## 0. Codex가 먼저 해야 할 일

작업을 시작하기 전에 아래 파일을 순서대로 읽고, 현재 구현과 충돌하는 지시가 있으면 현재 저장소 규칙을 우선한다.

1. `CLAUDE.md`
2. `docs/CURRENT_STATUS.md`
3. `docs/I18N_ROUTING.md`
4. `docs/DESIGN_SYSTEM.md`
5. `src/app/[lang]/about/page.tsx`
6. `src/lib/about.tsx`
7. `content/bio/{ko,en}.mdx`
8. `content/about/{ko,en}.mdx`
9. `content/about/media.json`
10. `src/dictionaries/{ko,en}.json`
11. `src/app/sitemap.ts`
12. `src/app/layout.tsx`

작업 전 현재 브랜치를 확인하고, 다른 변경이 섞여 있다면 임의로 덮어쓰지 않는다. 불필요한 리팩터링과 신규 패키지 추가는 금지한다.

---

# 1. 결정된 정보구조

## 채택안

세 가지 안 중 **2번의 변형**을 채택한다.

- 기존 `/ko/about`, `/en/about`는 첫 방문자를 위한 간결한 프로필 허브로 유지한다.
- 상세 브랜딩 문서는 날짜 없는 영구 하위 페이지로 만든다.
  - `/ko/about/mission`
  - `/en/about/mission`
- 글로벌 헤더에 드롭다운이나 새 최상위 메뉴를 추가하지 않는다.
- About 영역 내부에만 작은 로컬 내비게이션을 둔다.
  - 한국어: `소개` | `미션과 원칙`
  - 영어: `About` | `Mission & Principles`
- About 본문 끝에는 상세 페이지로 이동하는 짧고 명확한 CTA를 추가한다.

## 이 구조를 선택하는 이유

1. **일반 게시물이 아니다.** 개인의 미션과 원칙은 날짜가 붙고 피드에서 밀려나는 에세이가 아니라, 계속 수정·참조되는 canonical page여야 한다.
2. **About의 역할을 보존한다.** About은 프로필, 현재 역할, 외부 활동, 연락처를 빠르게 파악하는 페이지다. 장문의 선언문을 합치면 첫 방문자의 탐색 비용이 커진다.
3. **핵심 내용을 접어 숨기지 않는다.** Purpose, Vision, Mission과 핵심 원칙은 `<details>` 안에 넣을 정보가 아니다.
4. **글로벌 내비게이션을 복잡하게 만들지 않는다.** 새 페이지는 About의 하위 맥락으로 충분히 발견 가능하게 하되, 사이트 전체 IA는 단순하게 유지한다.
5. **브랜드는 넓게, 증거는 구체적으로 제시한다.** 상위 미션은 AI & Robotics와 사람들의 삶에 두고, ART Lab·뷰티·제조·COSMAX·서울대는 그 미션을 실제로 수행해온 구체적 증거로 배치한다.

---

# 2. 브랜드의 최종 기준

## Primary tagline

### Korean

**AI와 Robotics의 최전선을, 일상의 현실로.**

### English

**Turning frontier AI & Robotics into everyday reality.**

## One-sentence positioning

### Korean

**Terry는 AI & Robotics의 최전선을 깊이 이해하고, 현실의 필요와 연결해 사람들이 실제로 쓰는 제품·시스템·조직으로 만드는 연구자이자 창업가다.**

### English

**Terry is an AI & Robotics researcher-entrepreneur who understands frontier capabilities deeply and turns them into products, systems, and organizations built around real human needs.**

## Public identity hierarchy

1. **AI & Robotics Researcher–Entrepreneur** — 가장 즉시 이해되는 공식 정체성
2. **Frontier-to-Life Builder** — Terry만의 차별화된 descriptor
3. **Founding Architect** — 연구·제품·팀·자본·조직·생태계를 함께 설계하는 작업 방식

`Frontier-to-Life Builder`와 `Founding Architect`는 보조 표현으로 사용한다. 첫 화면에서 설명 없이 둘만 내세우지 않는다.

## Purpose

**기술의 진보를 삶의 진보로 바꾼다.**<br />
**Turn technological progress into lived progress.**

## Vision

### Korean

AI & Robotics의 가장 앞선 능력이 소수의 연구실과 빅테크의 데모에 머물지 않고, 사람들이 일상과 일터에서 자연스럽고 유용하게 사용하는 세상.

### English

A world where the most advanced capabilities in AI & Robotics become useful, trusted, and ordinary parts of how people live and work.

## Mission

### Korean

미래 기술을 직접 연구하고 실험해 깊이 이해하고, 현실의 중요한 필요를 발견하며, 둘을 연결하는 제품·시스템·조직을 만든다.

### English

Study and test frontier technologies firsthand, identify consequential needs in the real world, and build the products, systems, and organizations that connect the two.

## North Star

**Authored Impact**

규모 자체를 최대화하는 것이 아니라, 스스로 중요하다고 믿는 문제를 선택하고 깊이 이해해 핵심 해법을 설계하며 현실에 존재하게 만든 변화를 추구한다.

## Core values

- **Authorship** — 내가 중요하다고 믿는 질문을 스스로 선택하고 결과에 책임진다.
- **Depth** — 소개하거나 판단하기 전에 직접 연구하고 실험해 이해한다.
- **Human Relevance** — 기술이 아니라 사람들의 실제 필요와 제약에서 출발한다.
- **Building** — 설명에 머물지 않고 제품·시스템·조직으로 존재하게 한다.
- **Multiplication** — 내가 만든 것뿐 아니라 나로 인해 가능해진 사람·연구·회사·분야를 남긴다.

## Personal rule

**선택은 자유롭게, 완수는 엄격하게.**<br />
**Choose freely. Finish rigorously.**

---

# 3. 작업 범위

## 새로 만들 파일

- `content/about/mission/ko.mdx`
- `content/about/mission/en.mdx`
- `src/app/[lang]/about/mission/page.tsx`
- `src/components/about/AboutLocalNav.tsx`

## 수정할 파일

- `content/bio/ko.mdx`
- `content/bio/en.mdx`
- `content/about/ko.mdx`
- `content/about/en.mdx`
- `content/about/media.json`
- `src/lib/about.tsx`
- `src/app/[lang]/about/page.tsx`
- `src/dictionaries/ko.json`
- `src/dictionaries/en.json`
- `src/app/sitemap.ts`
- `src/app/layout.tsx`
- `docs/SITEMAP_IA.md`
- `docs/PAGE_SPECS.md`
- `docs/CURRENT_STATUS.md`

## 비범위

- 글로벌 헤더에 `Mission` 최상위 메뉴나 드롭다운을 추가하지 않는다.
- 일반 Essays/Post로 만들지 않는다.
- 댓글, 태그, 게시일, 읽기 시간, 관련 글 영역을 붙이지 않는다.
- 외부 이미지, 일러스트, 애니메이션, 새 폰트, 새 UI 라이브러리를 추가하지 않는다.
- About의 `AroundTheWeb`, Social icons, Contact 구조를 재설계하지 않는다.
- 본 작업과 무관한 컴포넌트, 포스트, 라우팅, 스타일을 리팩터링하지 않는다.
- 배포는 수행하지 않는다. 로컬 검증과 변경 요약까지만 한다.

---

# 4. 정확한 카피 변경

## 4.1 `content/bio/ko.mdx`

파일 전체를 아래 내용으로 교체한다.

```mdx
AI와 Robotics의 최전선을 일상의 현실로 바꾸는 연구자이자 창업가.<br className="hidden sm:block" />
미래 기술을 깊이 이해하고 현실의 필요와 연결해,<br className="hidden sm:block" />
사람들이 실제로 쓰는 제품·시스템·조직을 만든다.
```

## 4.2 `content/bio/en.mdx`

파일 전체를 아래 내용으로 교체한다.

```mdx
AI & Robotics researcher-entrepreneur turning frontier capabilities into everyday reality.<br className="hidden sm:block" />
Deeply studying emerging technologies, connecting them with real human needs,<br className="hidden sm:block" />
and building products, systems, and organizations people can actually use.
```

---

## 4.3 `content/about/ko.mdx`

파일 전체를 아래 내용으로 교체한다.

```mdx
**AI와 Robotics의 최전선을 일상의 현실로 바꾸는 연구자이자 창업가이다.** 새로운 기술을 소개하는 데 그치지 않는다. 직접 연구하고 실험해 실제 능력과 한계를 이해하고, 사람들의 필요와 연결해 제품·시스템·조직으로 구현한다.

서울대, 워털루대, KIST에서 AI·로보틱스를 연구했고, 대학원생 대상 강연과 글을 통해 연구자의 삶과 창업의 가능성을 나눠 왔다. 2019년에는 ART Lab을 창업해 AI가 사람들의 일상적 경험을 바꾸는 방법을 뷰티 산업에서 실험했다. ART Lab이 코스맥스에 합류한 뒤에는 AI & Robotics를 총괄하며 Physical AI가 실제 제조현장에서 작동하는 조건을 만들고 있다. 서울대학교 기계공학부 겸직교수로 연구와 인재 양성도 이어가고 있다.

뷰티와 제조는 최종 목적이 아니라, 미래 기술을 현실로 옮기는 방법을 배우고 증명해 온 구체적인 현장이다. 연구자, 창업가, 기업 임원, 교수, 작가 가운데 하나의 직함이나 특정 산업으로 정체성을 한정하지 않는다. **중요한 문제를 스스로 선택하고, 좋은 사람들과 깊이 탐구해, 세상에 없던 것을 실제로 존재하게 하는 삶**을 지향한다. 그 과정에서 배운 것은 글과 강연으로 나눈다.

“어떤 삶을 살아야 하는가” 같은 질문을 오래 붙들고, 가족과 함께하는 소소한 행복을 소중히 여긴다. 자유롭게 질문하고 깊이 이해하되, 선택한 중요한 문제는 끝까지 현실에 남기는 삶을 지향한다.
```

## 4.4 `content/about/en.mdx`

파일 전체를 아래 내용으로 교체한다.

```mdx
**Terry is an AI & Robotics researcher-entrepreneur who turns frontier capabilities into everyday reality.** Rather than merely explaining emerging technologies, he studies and tests them firsthand, understands their actual capabilities and limits, and turns them into products, systems, and organizations built around real human needs.

His path has included AI and robotics research at Seoul National University, the University of Waterloo, and KIST, as well as talks and writing on research life and entrepreneurship for graduate students. In 2019, he founded ART Lab to explore how AI could reshape everyday experiences in the beauty industry. After ART Lab joined COSMAX, he began leading AI & Robotics and building the conditions for Physical AI to work in real manufacturing environments. He also serves as an adjunct professor in Mechanical Engineering at Seoul National University, continuing his work in research and education.

Beauty and manufacturing are not the mission itself. They are concrete fields in which he has learned and demonstrated how frontier technology becomes reality. His work is not confined to a single title—researcher, founder, executive, professor, or writer—or to a single industry. It is guided by an effort to **choose consequential problems, explore them deeply with people he respects, and bring something genuinely new into the world**. What he learns is shared through writing and talks.

Beyond work, he tends to stay with questions such as how to live well and values the small joys of life with his family. The aim is to question freely and understand deeply, while carrying consequential work through until it leaves something real behind.
```

---

## 4.5 `content/about/media.json`

`currently`만 아래와 같이 변경하고 나머지 media 항목은 건드리지 않는다.

```json
"currently": {
  "ko": "현재는 제조 Physical AI를 위한 연구·실증 체계를 만들고, 대학·스타트업·로봇기업·제조현장을 연결하는 일에 집중하고 있습니다.",
  "en": "Currently focused on building research and deployment systems for Physical AI, connecting universities, startups, robotics companies, and real manufacturing sites."
}
```

이 문장은 상위 미션을 제조에 한정하지 않되, 현재의 구체적 전장을 명확히 보여주는 역할을 한다.

---

# 5. 새 Mission & Principles 페이지 콘텐츠

## 5.1 `content/about/mission/ko.mdx`

아래 내용을 그대로 사용한다. 이 파일에는 페이지 H1을 다시 넣지 않는다. H1과 lead 문장은 페이지 컴포넌트에서 렌더링한다.

```mdx
저는 미래 기술을 설명하는 데 그치지 않고, **그 기술이 사람들의 삶과 일에서 실제로 작동하도록 만드는 사람**이고자 합니다.

AI & Robotics의 가장 앞선 연구와 제품을 직접 공부하고 실험합니다. 동시에 사람들이 현실에서 겪는 필요와 제약, 사용자 경험, 조직과 시장을 깊이 이해하려 합니다. 그리고 그 둘 사이에 빠져 있는 기술, 제품, 업무방식, 팀과 회사를 만들어 가능성을 현실로 옮깁니다.

이 때문에 저는 전형적인 순수 연구자도, 기술을 소개하는 인플루언서도, 조직을 관리하는 경영자도 아닙니다. 연구자이자 창업가이며, 필요한 문제와 장을 새로 설계하는 **Frontier-to-Life Builder이자 Founding Architect**에 가깝습니다.

## 내가 붙들고 있는 문제

### 기술의 발전과 삶의 변화 사이에는 큰 간극이 있습니다

AI & Robotics는 빠르게 발전하지만 사람들의 일상과 일터는 같은 속도로 변하지 않습니다. 좋은 연구는 논문과 데모에서 끝나고, 뛰어난 기술은 실제 필요와 만나지 못하며, 산업은 새로운 능력을 받아들일 제품·프로세스·조직을 갖추지 못한 경우가 많습니다.

이 간극은 단순한 기술 부족의 문제가 아닙니다. 연구자는 현실의 제약을 충분히 알기 어렵고, 산업은 현재의 업무방식 안에서만 문제를 정의하기 쉽습니다. 그 사이에서 사용자 경험, 신뢰성, 경제성, 통합, 운영과 책임의 문제가 빠집니다.

제가 일하고 싶은 곳은 바로 이 **Frontier–Life Gap**입니다. 기술을 현실에 억지로 적용하는 것이 아니라, 기술과 현실을 함께 이해하고 필요하면 양쪽을 모두 다시 설계하는 일입니다.

## 내가 일하는 방식: Frontier-to-Life Loop

1. **Discover — 미래의 가능성을 먼저 발견합니다.**<br />
   유행을 빠르게 전달하는 데 그치지 않고, 앞으로 사람들의 능력과 산업의 구조를 바꿀 근본적인 기술 변화를 찾습니다.

2. **Understand — 직접 연구하고 실험해 이해합니다.**<br />
   논문 요약과 기업 발표만으로 판단하지 않습니다. 모델을 설치하고, 로봇을 움직이고, 프로토타입을 만들며 실제 능력과 한계를 확인합니다.

3. **Define — 현실의 중요한 문제를 다시 정의합니다.**<br />
   기술을 적용할 곳을 찾기보다, 사람들이 반복적으로 겪는 불편과 손실, 아직 제대로 해결되지 않은 필요를 찾습니다. 그 문제에 AI & Robotics가 본질적으로 새로운 해법을 줄 수 있는지 묻습니다.

4. **Build — 필요한 전체 시스템을 만듭니다.**<br />
   모델이나 로봇 한 대만으로 현실은 바뀌지 않습니다. 제품, 사용자 경험, 데이터, 업무방식, 기존 시스템, 비즈니스 모델과 팀을 함께 설계합니다.

5. **Embed — 실제 환경에 들어가 작동하게 합니다.**<br />
   연구실의 성공보다 현실의 반복 가능성, 신뢰성, 복구 가능성, 경제성과 사용성을 검증합니다. 필요하면 기술뿐 아니라 현장의 프로세스도 바꿉니다.

6. **Multiply — 변화가 지속되고 증식되는 구조를 남깁니다.**<br />
   한 번의 프로젝트에서 끝내지 않고 제품, 회사, 연구조직, 교육, 글, 표준과 생태계로 확장합니다. 제가 직접 만든 것뿐 아니라 다른 사람들이 새롭게 만들 수 있는 조건을 남깁니다.

## 하나의 미션, 여러 개의 현장

### 논문 밖의 연구실

저의 출발점은 독립 연구와 교육이었습니다. 연구는 학위와 논문을 위한 과정만이 아니라 한 사람이 자신의 질문을 발견하고 성장하는 방식이라고 믿었습니다. 대학원생을 위한 강연과 글을 만들고 『대학원생 때 알았더라면 좋았을 것들』을 공동 집필한 것도, 연구와 창업이 연구자의 자아실현과 사회적 영향력을 함께 만드는 길이 될 수 있다고 보았기 때문입니다.

### ART Lab과 뷰티

좋은 생각을 전하는 것만으로는 충분하지 않다고 느껴 하나의 vertical industry에 직접 들어갔습니다. 2019년 ART Lab을 창업하고 AI를 스킨케어와 뷰티 경험에 적용했습니다. 뷰티는 사람들의 일상과 가깝다는 점에서 미션과 잘 맞았고, 동시에 기술만으로 산업이 움직이지 않으며 사용자, 브랜드, 유통과 마케팅까지 이해해야 한다는 사실을 가르쳐 주었습니다.

### Physical AI와 제조

Robotics를 현실에 적용하려 하자 제조는 피할 수 없는 구체적인 현장이 되었습니다. 사람의 수작업, 오래된 설비, 데이터가 부족한 공정과 새로운 AI·로봇이 공존하는 곳에서 기술은 논문보다 훨씬 엄격한 질문을 받습니다. 지금 제조는 저의 정체성이 아니라, **AI & Robotics가 현실에서 정말 유용해질 수 있는지를 검증하는 가장 어려운 실험장**입니다.

### 대학과 생태계

대학은 다시 깊은 질문을 만들고 좋은 연구자와 학생을 만날 수 있는 공간입니다. 산업은 실제 문제와 데이터, 자본과 실행의 장을 제공합니다. 저는 둘 중 하나를 선택하기보다 대학·기업·스타트업·연구자·자본을 연결해, 혼자서는 만들 수 없는 연구와 제품과 회사를 태어나게 하는 구조를 만들고자 합니다.

분야와 역할은 바뀌어 왔지만 반복한 일은 같습니다.

> **미래의 가능성을 먼저 발견하고, 직접 이해한 뒤, 현실의 중요한 문제와 연결해 사람들이 실제로 사용할 수 있는 변화로 만드는 것.**

## 내가 중요하게 여기는 것

### Authorship — 내가 질문을 선택합니다

남이 만든 게임에서 높은 점수를 얻는 것보다, 제가 중요하다고 믿는 문제를 선택하고 제 방식으로 풀며 그 결과에 책임지는 것을 중요하게 생각합니다. 직함과 조직은 그 질문을 더 잘 탐구하기 위한 플랫폼이어야 합니다.

### Depth — 먼저 깊이 이해합니다

기술을 소개하거나 사람과 자본을 움직이기 전에, 직접 공부하고 실험해 스스로 판단할 수 있어야 합니다. 학구적 호기심과 hands-on experience는 별개의 취미가 아니라 현실적인 결정을 내리는 기반입니다.

### Human Relevance — 실제 필요에서 출발합니다

기술적으로 신기하다는 이유만으로 충분하지 않습니다. 누구의 삶과 일이 어떻게 달라지는지, 기존 방식보다 실제로 나은지, 사람이 겪는 중요한 문제를 해결하는지를 묻습니다.

### Building — 설명보다 존재하게 합니다

아이디어와 전략에 머물지 않고 작동하는 기술, 사람들이 사용하는 제품, 반복 가능한 시스템, 새로운 팀이나 회사를 현실에 남깁니다.

### Multiplication — 나로 인해 가능해진 것을 남깁니다

모든 것을 직접 만들 필요는 없습니다. 좋은 연구자와 창업가를 발견하고, 문제와 기술과 자본을 연결하며, 다른 사람이 더 큰 일을 할 수 있게 만드는 것도 중요한 결과입니다.

## North Star: Authored Impact

저는 영향력의 규모만을 최대화하려 하지 않습니다. 규모가 커질수록 문제와 멀어지고 설득·관리·정치만 남는다면 그것은 제가 원하는 성공이 아닙니다. 반대로 자유와 호기심만 좇아 중요한 일을 끝내지 못하는 삶도 원하지 않습니다.

제가 추구하는 것은 **Authored Impact**입니다.

> **내가 중요하다고 믿는 문제를 스스로 선택하고, 충분히 깊이 이해하며, 핵심 해법을 직접 설계해 현실에 존재하게 만든 변화.**

규모는 목적이 아니라 증폭기입니다. 규모가 제 문제의식과 판단을 더 멀리 전달한다면 좋은 확장이고, 제가 문제에서 멀어지게 한다면 다시 설계해야 할 확장입니다.

## 내가 지향하는 삶

제가 생각하는 좋은 삶은 다음과 같습니다.

> **내가 중요하다고 믿는 문제를, 내가 선택한 사람들과, 충분한 자율성을 가지고 깊이 이해하고 직접 만들어, 누군가의 삶과 일이 실제로 달라지게 하는 삶.**

그 삶을 위해 한 가지 규율을 둡니다.

> ## 선택은 자유롭게, 완수는 엄격하게.

무엇을 할지는 자유롭게 선택합니다. 그러나 한 번 중요하다고 선택한 문제의 지루한 중간 구간에서는 쉽게 도망가지 않습니다. 더 새로운 기술이나 더 화려한 기회가 나타났다는 이유로 핵심 문제를 버리지 않고, 최소한 현실에 남는 결과와 다음 사람이 이어갈 수 있는 배움을 만듭니다.

직함은 정체성이 아니라 플랫폼입니다. 콘텐츠는 브랜드의 원천이 아니라 직접 연구하고 만든 경험의 증폭기입니다. 그리고 최종적인 성취는 제가 만든 것만이 아니라, 제가 있었기 때문에 가능해진 사람·연구·제품·회사와 분야입니다.

> **자유롭게 질문하고,**<br />
> **깊이 이해하며,**<br />
> **직접 만들고,**<br />
> **삶에 남깁니다.**
```

---

## 5.2 `content/about/mission/en.mdx`

아래 내용을 그대로 사용한다. 한국어의 직역보다 자연스러운 영어 문장을 우선한다.

```mdx
I do not want to stop at explaining the future. I want to **make frontier technology work in the reality of how people live and work**.

I study and test the most advanced work in AI & Robotics firsthand. At the same time, I try to understand real needs and constraints—users, workflows, organizations, and markets. Then I build what is missing between the two: technology, products, ways of working, teams, and ventures that turn possibility into reality.

That makes me neither a conventional pure researcher, a technology commentator, nor an executive focused only on managing organizations. I am a researcher and entrepreneur, and increasingly a **Frontier-to-Life Builder and Founding Architect** who creates the problems, structures, and fields through which new technology can matter.

## The problem I keep returning to

### Technological progress moves faster than lived change

AI & Robotics are advancing rapidly, but everyday life and work do not change at the same pace. Strong research often ends with a paper or a demo. Powerful capabilities fail to meet real needs. Industries often lack the products, processes, organizations, and operating models required to absorb what has become technically possible.

This is not only a technology gap. Researchers rarely see all of reality's constraints, while organizations tend to define problems within the limits of their current workflows. User experience, reliability, economics, integration, operations, and responsibility are left in between.

That **Frontier–Life Gap** is where I want to work. The task is not to force technology into reality. It is to understand both sides deeply—and redesign either or both when necessary.

## How I work: the Frontier-to-Life Loop

1. **Discover — See the next capability early.**<br />
   I look beyond transmitting trends to identify technological shifts that may fundamentally change human capability and the structure of industries.

2. **Understand — Study and test it firsthand.**<br />
   I do not rely only on paper summaries or company announcements. I install the models, move the robots, build prototypes, and examine what truly works and what does not.

3. **Define — Reframe consequential real-world problems.**<br />
   Rather than search for somewhere to apply a technology, I look for recurring pain, waste, and unmet needs. I then ask whether AI & Robotics can offer a genuinely new solution.

4. **Build — Create the whole system that is required.**<br />
   A model or a robot alone rarely changes reality. I consider the product, user experience, data, workflow, legacy systems, business model, and team as one system.

5. **Embed — Make it work in the real environment.**<br />
   I care about repeatability, reliability, recovery, economics, and usability—not just laboratory success. Sometimes the process must change along with the technology.

6. **Multiply — Leave a structure that can keep growing.**<br />
   I try to extend a one-off project into a product, venture, research organization, educational resource, standard, or ecosystem. The goal is not only what I build, but what others become able to build.

## One mission, several arenas

### A lab beyond papers

I began with independent research and education. I believed research could be more than a route to a degree or a paper; it could be a way for a person to discover meaningful questions and grow through them. My talks and writing for graduate students—including co-authoring *Things I Wish I'd Known in Grad School*—came from the belief that research and entrepreneurship could both become paths to self-realization and real-world impact.

### ART Lab and beauty

Eventually, sharing ideas no longer felt sufficient. I entered a vertical industry and founded ART Lab in 2019, applying AI to skincare and beauty experiences. Beauty fit the mission because it is close to everyday life. It also taught me that technology alone does not move an industry; users, brands, distribution, and marketing matter just as much.

### Physical AI and manufacturing

As I tried to bring robotics into reality, manufacturing became an unavoidable concrete field. Here, human manual work, legacy equipment, limited data, and new AI-powered robots must coexist. Technology faces far stricter questions than it does in a paper. Manufacturing is not my identity or final mission. It is currently **the most demanding proving ground for whether AI & Robotics can become genuinely useful in the real world**.

### Universities and ecosystems

Universities offer the freedom to form deep questions and work with excellent researchers and students. Industry offers real problems, data, capital, and the ability to execute. Rather than choose one side, I want to connect universities, companies, startups, researchers, and capital—and build structures from which research, products, and ventures can emerge that none of them could create alone.

The fields and titles have changed, but the recurring work has remained the same:

> **See a future possibility early, understand it firsthand, connect it with a consequential real-world problem, and turn it into change that people can actually use.**

## What I value

### Authorship — Choose the question

I value choosing a problem I believe matters, approaching it in my own way, and taking responsibility for the result more than scoring highly in a game designed by someone else. Titles and institutions should be platforms for pursuing the question—not substitutes for it.

### Depth — Understand before judging

Before explaining a technology or mobilizing people and capital around it, I need to study and test it well enough to form my own judgment. Intellectual curiosity and hands-on experience are not side interests; they are the basis of sound real-world decisions.

### Human Relevance — Start with real needs

Technical novelty is not enough. I ask whose life or work will change, whether the new approach is actually better, and whether it addresses a consequential human problem.

### Building — Make it exist

I want to leave behind working technology, a product people use, a repeatable system, or a new team and venture—not only an idea or a strategy.

### Multiplication — Leave what became possible

I do not need to build everything myself. Discovering strong researchers and founders, connecting problems with technology and capital, and enabling others to do larger work are also meaningful outputs.

## North Star: Authored Impact

I do not optimize for maximum scale at any cost. If growth takes me so far from the problem that only persuasion, administration, and politics remain, it is not the success I want. But I also do not want freedom and curiosity to become reasons for leaving important work unfinished.

My north star is **Authored Impact**:

> **Change created by choosing a problem I believe matters, understanding it deeply, designing a decisive part of the solution, and making it real.**

Scale is a multiplier, not the purpose. It is good when it carries the original insight and judgment farther. It should be redesigned when it separates me from the problem itself.

## The life I want to build

A good life, to me, is:

> **To choose problems I believe matter, explore them deeply with people I respect, retain enough autonomy to build in my own way, and leave behind something that genuinely changes how someone lives or works.**

That life requires one discipline:

> ## Choose freely. Finish rigorously.

I want to remain free in what I choose. But once I choose a problem that matters, I do not want to escape its long and tedious middle simply because a newer technology or more glamorous opportunity appears. I should leave at least a real result and enough learning for someone else to continue.

Titles are platforms, not identities. Content should amplify experience earned through researching and building, not substitute for it. And the final measure is not only what I personally create, but the people, research, products, ventures, and fields that became possible because I was there.

> **Question freely.**<br />
> **Understand deeply.**<br />
> **Build directly.**<br />
> **Leave it in life.**
```

---

# 6. Dictionary 변경

전체 JSON을 덮어쓰지 말고 기존 키를 유지하면서 아래 필드를 수정·추가한다.

## 6.1 `src/dictionaries/ko.json`

### `hero.tagline` 교체

```json
"tagline": "AI & Robotics 연구자·창업가 · 최전선의 기술을 일상의 현실로"
```

### `about` 객체에 추가

```json
"profile_nav": "소개",
"mission_nav": "미션과 원칙",
"mission_cta_eyebrow": "FRONTIER TO LIFE",
"mission_cta_title": "AI와 Robotics의 최전선을, 일상의 현실로.",
"mission_cta_description": "무엇을 만들고 왜 이 일을 하는지, 그리고 어떤 원칙으로 삶과 일을 선택하는지를 정리한 글입니다.",
"mission_cta_link": "미션과 원칙 읽기"
```

### 새 최상위 객체 `mission_page` 추가

```json
"mission_page": {
  "meta_title": "미션과 원칙",
  "meta_description": "AI & Robotics의 최전선을 깊이 이해하고 현실의 필요와 연결해 일상의 변화로 만드는 Terry의 미션과 원칙",
  "eyebrow": "AI & ROBOTICS RESEARCHER–ENTREPRENEUR",
  "title": "AI와 Robotics의 최전선을, 일상의 현실로.",
  "lead": "미래 기술을 깊이 이해하고 현실의 필요와 연결해, 사람들이 실제로 쓰는 제품·시스템·조직으로 만듭니다.",
  "descriptor": "Frontier-to-Life Builder · Founding Architect",
  "purpose_label": "PURPOSE",
  "purpose_title": "기술의 진보를 삶의 진보로 바꿉니다.",
  "purpose_body": "AI & Robotics의 성취가 연구자와 기업의 성과에 머물지 않고 사람들의 삶과 일의 실제 변화로 이어지게 합니다.",
  "vision_label": "VISION",
  "vision_title": "최전선의 기술이 일상의 능력이 되는 세상.",
  "vision_body": "AI & Robotics의 가장 앞선 능력을 사람들이 일상과 일터에서 자연스럽고 유용하게 사용하는 세상을 지향합니다.",
  "mission_label": "MISSION",
  "mission_title": "미래 기술과 현실의 필요 사이에 빠진 것을 만듭니다.",
  "mission_body": "기술을 직접 연구하고 실험해 이해하고, 중요한 현실의 문제를 찾아, 둘을 연결하는 제품·시스템·조직을 만듭니다."
}
```

## 6.2 `src/dictionaries/en.json`

### `hero.tagline` 교체

```json
"tagline": "AI & Robotics Researcher–Entrepreneur · Turning frontier technology into everyday reality"
```

### `about` 객체에 추가

```json
"profile_nav": "About",
"mission_nav": "Mission & Principles",
"mission_cta_eyebrow": "FRONTIER TO LIFE",
"mission_cta_title": "Turning frontier AI & Robotics into everyday reality.",
"mission_cta_description": "The mission behind the work, the change it seeks, and the principles for choosing how to live and build.",
"mission_cta_link": "Read my mission and principles"
```

### 새 최상위 객체 `mission_page` 추가

```json
"mission_page": {
  "meta_title": "Mission & Principles",
  "meta_description": "Terry's mission and principles for understanding frontier AI & Robotics deeply and turning them into meaningful change in everyday life",
  "eyebrow": "AI & ROBOTICS RESEARCHER–ENTREPRENEUR",
  "title": "Turning frontier AI & Robotics into everyday reality.",
  "lead": "I understand emerging technologies deeply, connect them with real human needs, and build products, systems, and organizations people can actually use.",
  "descriptor": "Frontier-to-Life Builder · Founding Architect",
  "purpose_label": "PURPOSE",
  "purpose_title": "Turn technological progress into lived progress.",
  "purpose_body": "Move the achievements of AI & Robotics beyond papers and corporate milestones into meaningful changes in how people live and work.",
  "vision_label": "VISION",
  "vision_title": "A world where frontier technology becomes an everyday capability.",
  "vision_body": "The most advanced capabilities in AI & Robotics become useful, trusted, and ordinary parts of everyday life and work.",
  "mission_label": "MISSION",
  "mission_title": "Build what is missing between frontier technology and real needs.",
  "mission_body": "Study and test the technology firsthand, identify consequential real-world problems, and build the products, systems, and organizations that connect the two."
}
```

JSON 문법과 trailing comma를 반드시 검증한다.

---

# 7. UI/UX 구현 명세

## 7.1 `AboutLocalNav`

`src/components/about/AboutLocalNav.tsx`를 만든다.

### Props

```ts
type AboutLocalNavProps = {
  locale: Locale;
  active: 'profile' | 'mission';
  labels: {
    profile: string;
    mission: string;
  };
};
```

### 동작

- 링크:
  - `/${locale}/about`
  - `/${locale}/about/mission`
- `aria-label="About navigation"`
- 활성 항목에 `aria-current="page"`
- 글로벌 Header 탭과 경쟁하지 않도록 작은 segmented text navigation으로 만든다.
- 현재 디자인 토큰만 사용한다.
- 과한 pill, 그림자, 애니메이션을 사용하지 않는다.
- 모바일에서도 두 항목이 한 줄에 안정적으로 들어가야 한다.

## 7.2 기존 About 페이지

`src/app/[lang]/about/page.tsx`에서 다음만 변경한다.

1. 프로필 영역과 상세 About 본문 사이에 `AboutLocalNav`를 추가한다.
2. `aboutContent` 아래, `Currently` 위에 절제된 Mission CTA를 추가한다.
3. CTA 전체가 링크이되 키보드 focus가 명확해야 한다.
4. CTA 스타일:
   - `border-line-default`
   - 배경은 기본 또는 `bg-bg-surface`
   - eyebrow는 작은 uppercase accent text
   - 제목은 `text-lg` 수준
   - 설명 2줄 이내
   - 화살표는 텍스트 또는 기존 icon만 사용
5. 기존 Profile, SocialIcons, Currently, AroundTheWeb, Contact는 구조를 유지한다.

About 페이지는 여전히 프로필 허브여야 한다. 새 CTA가 AroundTheWeb보다 시각적으로 지나치게 크지 않게 한다.

## 7.3 Mission 페이지

`src/app/[lang]/about/mission/page.tsx`를 만든다.

### 공통

- `generateStaticParams()`에서 `ko`, `en` 지원
- 잘못된 locale은 현재 About 패턴과 동일하게 처리
- `getDictionary()`와 새 `getMissionContent()` 사용
- 레이아웃은 기존 About과 같은 `max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-10`
- 페이지 상단에 `AboutLocalNav active="mission"`

### Hero

순서:

1. eyebrow
2. H1
3. lead paragraph
4. descriptor

권장 스타일:

- H1: 기존 사이트 위계에 맞춰 모바일 약 26px, 데스크톱 최대 30px 내외
- 기존 색상 토큰과 typography만 사용
- `descriptor`는 작은 muted text
- 히어로 아래 충분한 여백과 얇은 divider
- 이미지나 장식적 그래픽은 넣지 않는다.

### Purpose / Vision / Mission

Hero 아래에 배경 카드가 아닌 에디토리얼 정보 블록으로 배치한다.

- 데스크톱: 3열, 열 사이에 얇은 세로 구분선
- 모바일: 1열, 항목 사이에 얇은 가로 구분선
- 각각 label, title, body
- 별도의 배경색, 그림자, 고정 높이를 사용하지 않는다.
- accent는 label 또는 얇은 선 정도로만 사용한다.

### Long-form content

- `content/about/mission/{ko,en}.mdx`를 `prose`로 렌더링한다.
- 핵심 내용을 `<details>`로 숨기지 않는다.
- `h2` 앞에는 충분한 상단 여백과 필요 시 얇은 divider를 준다.
- `h3`는 가치와 경로를 구분할 만큼 명확하지만 과도하게 크지 않게 한다.
- blockquote는 인용문이 아니라 핵심 선언으로 쓰이므로 italic을 강제하지 않는다.
- ordered list는 모바일에서 번호와 본문이 겹치지 않게 한다.
- 본문 폭과 행간은 현재 About/Essay typography와 일치시킨다.

### 하단

간단한 text link를 둔다.

- Korean: `← About Terry로 돌아가기`
- English: `← Back to About Terry`

별도의 contact form이나 newsletter CTA는 추가하지 않는다.

---

# 8. 콘텐츠 로더 구현

`src/lib/about.tsx`를 최소 변경한다.

1. raw import 추가:

```ts
import missionKoRaw from '../../content/about/mission/ko.mdx?raw';
import missionEnRaw from '../../content/about/mission/en.mdx?raw';
```

2. 현재 `SOURCES` 타입과 객체에 `mission`을 추가한다.

3. 다음 함수를 export한다.

```ts
export async function getMissionContent(locale: Locale) {
  return renderMarkdown('mission', locale);
}
```

4. 현재 `getBioPlainText()`는 `<br>` 태그가 포함된 raw text를 그대로 metadata description으로 전달할 수 있다. 이번 수정 범위에서 HTML/Markdown 흔적을 제거하도록 `readPlainText`를 안전하게 정리한다.

예시:

```ts
function readPlainText(dir: 'about' | 'bio' | 'mission', locale: Locale) {
  return SOURCES[dir][locale]
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\*_`#>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

현재 호출부와 타입에 맞춰 정확히 구현하고, 다른 Markdown 렌더링 동작은 바꾸지 않는다.

---

# 9. Metadata와 sitemap

## Mission metadata

`generateMetadata()`에서 `dict.mission_page`를 사용한다.

- `title`: `meta_title`
- `description`: `meta_description`
- `alternates.canonical`: 현재 locale의 mission URL
- `alternates.languages`:
  - `ko: /ko/about/mission`
  - `en: /en/about/mission`
- OpenGraph title/description/url도 동일하게 설정한다.

## Root metadata

`src/app/layout.tsx`의 fallback description을 아래로 변경한다.

```ts
description: 'AI & Robotics researcher-entrepreneur bringing frontier technology into everyday life.',
```

## Sitemap

`src/app/sitemap.ts`의 static pages loop에 양 언어 mission URL을 추가한다.

```ts
{
  url: `${BASE_URL}/${lang}/about/mission`,
  lastModified: new Date(),
  changeFrequency: 'monthly',
  priority: 0.55,
}
```

기존 URL의 priority와 구조는 바꾸지 않는다.

---

# 10. 디자인 원칙

- 이 페이지는 광고형 랜딩페이지가 아니라 **개인의 지적·직업적 헌장**처럼 보여야 한다.
- 기존 사이트의 중립적이고 차분한 디자인을 유지한다.
- 큰 슬로건 하나, 충분한 whitespace, 명확한 hierarchy를 사용한다.
- 그라데이션, 과한 그림자, glassmorphism, 카드 남용, 장식적 아이콘은 금지한다.
- `FRONTIER TO LIFE`, `PURPOSE`, `VISION`, `MISSION` 정도의 작은 영문 eyebrow는 허용한다.
- Korean/English에서 레이아웃이 크게 달라지지 않아야 한다.
- essential content는 접지 않는다.
- About 페이지와 Mission 페이지는 별개의 사이트처럼 보이지 않아야 한다.

## Bio 문체 원칙

- Home의 짧은 한국어 Bio는 이름 아래 놓이는 헤드라인이므로 주어를 생략하고 `-이다/-한다` 평서체를 사용한다.
- 한국어 About은 `저는`, `제가`, `저의`를 반복하지 않고 무주어 평서체로 정체성 → 경력 → 현재 활동 → 삶의 관점을 서술한다.
- 영문 Home Bio는 이름과 함께 읽히는 간결한 noun phrase로 구성하고, 영문 About은 공식 professional bio의 관례에 따라 `Terry is ...`로 시작하는 3인칭 서술을 사용한다.
- Mission & Principles의 장문 본문은 개인의 신념과 규율을 직접 선언하는 문서이므로 한·영 모두 1인칭을 유지한다.

---

# 11. 접근성 및 품질 기준

- 페이지당 H1은 정확히 하나다.
- heading level을 건너뛰지 않는다.
- active navigation에는 `aria-current="page"`를 사용한다.
- 모든 링크에 keyboard focus style이 있다.
- 텍스트 대비는 기존 디자인 토큰 범위에서 WCAG AA 수준을 해치지 않는다.
- 320px 폭에서도 horizontal overflow가 없어야 한다.
- 영어의 긴 title과 descriptor가 모바일에서 잘 줄바꿈되어야 한다.
- local nav, CTA, back link가 screen reader에서 의미 있게 읽혀야 한다.

---

# 12. 완료 조건

다음 항목을 모두 충족해야 완료다.

## Content

- [ ] 홈과 About의 short bio가 제조업을 장기 미션처럼 규정하지 않는다.
- [ ] About은 짧고 읽기 쉬우면서도 연구→교육→ART Lab→COSMAX/Physical AI→서울대의 연속성을 설명한다.
- [ ] 뷰티와 제조는 최종 목적이 아니라 구체적인 field/proving ground로 표현된다.
- [ ] 한국어와 영어의 의미가 동일하며 번역투가 심하지 않다.
- [ ] `Currently`는 직함 반복 대신 현재 집중하는 일과 연결 방식을 말한다.

## IA / UX

- [ ] `/ko/about/mission`, `/en/about/mission`가 정상 렌더링된다.
- [ ] About과 Mission 페이지의 local nav가 상호 이동한다.
- [ ] About 끝의 CTA가 Mission 페이지로 이동한다.
- [ ] 글로벌 Header에는 새 최상위 메뉴가 생기지 않는다.
- [ ] locale switch가 현재 path를 유지하며 `/ko/about/mission` ↔ `/en/about/mission`로 이동한다.

## SEO

- [ ] KO/EN mission metadata가 각각 올바르다.
- [ ] bio의 `<br>`가 metadata description에 노출되지 않는다.
- [ ] sitemap에 두 mission URL이 포함된다.
- [ ] canonical과 language alternates가 올바르다.

## Visual / responsive

- [ ] 1440px, 768px, 390px, 320px에서 확인한다.
- [ ] H1, P/V/M 정보 블록, long-form headings, blockquotes가 자연스럽다.
- [ ] About이 Mission 콘텐츠 때문에 과도하게 길어지지 않는다.
- [ ] dark mode와 light mode 모두 확인한다.

## Regression

- [ ] 기존 Home, About, Posts, Surveys route가 정상이다.
- [ ] AroundTheWeb와 Contact가 이전과 동일하게 동작한다.
- [ ] 새 패키지가 추가되지 않는다.

---

# 13. 검증 명령

라우트 추가 작업이므로 저장소의 동시 빌드 보호 로직이 있는 `scripts/clean-next.mjs`를 통해 `.next`를 정리한 뒤 검증한다. 아래 npm 스크립트는 이 정리 단계를 자체 포함한다.

```bash
npm run type-check
npm run lint
npm run build
```

`npm run lint`가 현재 Next 버전 또는 기존 설정 문제로 실행되지 않는다면 그 사실을 숨기지 말고, 정확한 오류와 대신 수행한 검증을 완료 보고에 적는다.

가능하면 로컬 서버에서 아래 URL을 직접 확인한다.

```text
http://localhost:3040/ko
http://localhost:3040/en
http://localhost:3040/ko/about
http://localhost:3040/en/about
http://localhost:3040/ko/about/mission
http://localhost:3040/en/about/mission
```

---

# 14. 커밋 구성

저장소 규칙상 문서, content publish와 site code를 한 커밋에 섞지 않는다. 다음 세 커밋으로 나눈다.

## Commit 1 — docs

```text
docs(about): align mission spec with personal brand charter
```

포함:

- `docs/TERRY_PERSONAL_BRAND_CHARTER.md`
- `docs/terryum_about_mission_codex_spec.md`

## Commit 2 — content

```text
content(about): redefine Terry's personal brand and mission
```

포함:

- `content/bio/{ko,en}.mdx`
- `content/about/{ko,en}.mdx`
- `content/about/mission/{ko,en}.mdx`
- `content/about/media.json`

## Commit 3 — site code / i18n / route

```text
feat(about): add mission and principles page
```

포함:

- route/page/component/loader
- dictionary keys
- root metadata
- sitemap
- `docs/CURRENT_STATUS.md`

커밋을 실제로 만들지 않는 실행 환경이라면, 최종 보고에서 이 세 그룹으로 변경 파일을 분리해 제시한다.

---

# 15. 완료 보고 형식

Codex는 작업 후 아래 형식으로 간결하게 보고한다.

```md
## 구현 요약
- ...

## 변경 파일
### Content
- ...
### Code
- ...

## 검증
- `npm run type-check`: PASS/FAIL
- `npm run lint`: PASS/FAIL
- `npm run build`: PASS/FAIL
- 확인한 URL: ...

## 남은 이슈
- 없으면 `없음`
```

최종 보고에서 구현하지 않은 것을 구현했다고 말하지 않는다. 배포나 push는 별도 지시가 없으면 수행하지 않는다.
