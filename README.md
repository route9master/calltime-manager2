# calltime-manager2

구글 광고 대행사 직원 콜타임 관리 앱

## 구조

```
calltime-manager2/
├── backend/        # Node.js + Express + PostgreSQL
└── mobile/         # React Native Expo SDK 51
```

## 백엔드 설정

```bash
cd backend
npm install
cp .env.example .env
# .env 파일에 DATABASE_URL, JWT_SECRET 입력
npm start
```

## 모바일 설정

```bash
cd mobile
npm install
# src/config.js에서 BASE_URL을 Railway 배포 URL로 변경
npx expo start
```

## APK 빌드

```bash
cd mobile
eas build --platform android --profile preview
```

## Railway 배포

1. [Railway](https://railway.app) 접속 후 GitHub 레포 연결
2. `backend` 디렉토리를 루트로 설정
3. PostgreSQL 서비스 추가
4. 환경변수 설정:
   - `DATABASE_URL`: Railway PostgreSQL URL (자동 주입)
   - `JWT_SECRET`: 임의의 긴 문자열
5. 배포 후 URL을 `mobile/src/config.js`의 `BASE_URL`에 입력
6. OTA 업데이트: `eas update --branch production`

## 기본 계정

- 아이디: `admin`
- 비밀번호: `admin1234`
