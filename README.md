# Ledger Signer Service

별도 signer service로 서명 책임을 `coin_manage`에서 분리한다.

## 제공 API

- `POST /api/internal/signer/withdrawals/:withdrawalId/broadcast`
- `POST /api/internal/signer/virtual-wallets/:virtualWalletId/activation-reclaim`
- `POST /api/internal/signer/foxya-wallets/sweep`
- `POST /api/internal/signer/tron/broadcast-transfer`
- `POST /api/internal/signer/tron/broadcast-native`
- `POST /api/internal/signer/tron/delegate-resource`
- `POST /api/internal/signer/tron/undelegate-resource`
- `GET /health`

## 필수 환경 변수

- `WITHDRAW_SIGNER_API_KEY`: `coin_manage`와 공유하는 내부 API 키
- `HOT_WALLET_ADDRESS`: signer가 소유한 hot wallet 주소
- `HOT_WALLET_PRIVATE_KEY`: hot wallet 개인키
- `COIN_MANAGE_DB_*`: `virtual_wallet_bindings` 조회용 DB 연결 정보
- `COIN_MANAGE_VIRTUAL_WALLET_ENCRYPTION_KEY`: virtual wallet 개인키 복호화 키
- `FOXYA_DB_*`: `user_wallets` 조회용 DB 연결 정보
- `FOXYA_ENCRYPTION_KEY`: foxya 개인키 복호화 키
- `TRON_API_URL`, `MAINNET_TRON_API_URL`, `TESTNET_TRON_API_URL`: 읽기/브로드캐스트용 RPC
- `KORI_TOKEN_CONTRACT_ADDRESS`: 현재 런타임 프로파일용 기본 토큰 컨트랙트

예제는 [.env.example](./.env.example)에 있다.

## coin_manage 연동

`coin_manage` 쪽 env 예시:

```env
WITHDRAW_SIGNER_BACKEND=remote
WITHDRAW_SIGNER_API_URL=http://ledger-signer:3000/api/internal/signer
WITHDRAW_SIGNER_API_KEY=replace-with-shared-internal-key
```

중요:

- `WITHDRAW_SIGNER_API_URL`은 공통 base path다.
- 출금 signer 요청은 `/withdrawals/{withdrawalId}/broadcast`로 붙는다.
- per-wallet reclaim 요청은 `/virtual-wallets/{virtualWalletId}/activation-reclaim`로 붙는다.
- foxya sweep 요청은 `/foxya-wallets/sweep`로 붙는다.
- hot-wallet Tron 요청은 `/tron/*`로 붙는다.

## 로컬 실행

```bash
cp .env.example .env
npm install
npm run build
npm run start
```

개발 모드:

```bash
npm run dev
```

## Docker Cluster

이 서비스는 기본적으로 external network에 붙는다. `SHARED_DOCKER_NETWORK_NAME`은 coin_manage와 동일한 값을 써야 한다.

기동:

```bash
docker compose up -d --build
```

같은 network에 `coin_manage`를 띄우면 `app-api`, `app-withdraw-worker`, `app-ops`가 `http://ledger-signer:3000/api/internal/signer`로 접근할 수 있다.

## 현재 범위

현재는 아래 서명 경계를 `ledger-signer`가 담당한다.

- hot-wallet withdrawal broadcast
- hot-wallet TRC20/native/resource delegation broadcast
- virtual wallet activation reclaim
- foxya deposit wallet sweep

## 남은 고도화

- signer 전용 audit stream
- signer HA와 장애조치 절차
- 장기적으로 HSM/MPC 또는 signer vault 연동
