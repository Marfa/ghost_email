# Ghost Email Digest

**Собирает посты Ghost и создаёт черновик email-дайджеста** — без платных сервисов, только GitHub Actions + ваш Ghost.

```bash
cp .env.example .env   # GHOST_URL, GHOST_ADMIN_API_KEY
npm ci && npm test && npm run build && npm run digest
```

| Что | Как |
|-----|-----|
| Период сбора | После `state/last-run.json`; первый раз — 7 дней |
| Статусы постов | Опубликован + Запланирован |
| Результат | Черновик в Ghost с excerpt и «Читать дальше» |
| Автозапуск | GitHub Actions (бесплатно для public repo) |

## Quick Start

1. Ghost Admin → Settings → Integrations → Add custom integration → скопировать Admin API Key.
2. Локально: `.env` из `.env.example`.
3. `npm ci && npm run build && npm run digest`.
4. В GitHub: Secrets `GHOST_URL`, `GHOST_ADMIN_API_KEY`.

Первый запуск берёт посты за **7 дней**. Каждый следующий — только **после времени прошлого запуска**. Метка сохраняется в `state/last-run.json` (коммитится из CI).

## Переменные

| Переменная | Обязательно | По умолчанию |
|------------|-------------|--------------|
| `GHOST_URL` | да | — |
| `GHOST_ADMIN_API_KEY` | да | — |
| `DIGEST_INTRO` | нет | короткое приветствие |
| `DIGEST_EXCLUDE_TAG` | нет | `#weekly-email` |
| `FALLBACK_DAYS` | нет | `7` |
| `STATE_FILE` | нет | `state/last-run.json` |

## Инфраструктура

Дополнительных серверов не нужно. Ghost уже хостится у вас; cron — **GitHub Actions** (public repo: без лимита минут). Приватный repo: ~2000 мин/мес на бесплатном плане — для еженедельного job хватает.

---

Код подготовлен с помощью Cursor.

Поддержка: [DonationAlerts](https://www.donationalerts.com/r/themarfa) · [NOWPayments](https://nowpayments.io/donation/themarfa)
