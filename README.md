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
| Блок приветствия | ИИ: HF → Groq → шаблон «Приветствую. …» |
| Пометки ИИ | Снимаются перед черновиком (ZWSP, bidi, экзотические пробелы) |
| Результат | Черновик в Ghost с excerpt и «Читать дальше» |
| Автозапуск | GitHub Actions → Run workflow (только вручную) |

## Quick Start

1. Ghost Admin → Settings → Integrations → Add custom integration → скопировать Admin API Key.
2. Локально: `.env` из `.env.example`.
3. `npm ci && npm run build && npm run digest`.
4. В GitHub Secrets: `GHOST_URL` = `https://your-site.ghost.io` (корень сайта, **без** `/ghost`), `GHOST_ADMIN_API_KEY`.

Первый запуск берёт посты за **7 дней**. Каждый следующий — только **после времени прошлого запуска**. Метка сохраняется в `state/last-run.json` (коммитится из CI).

Запуск в GitHub: **Actions → Weekly digest → Run workflow**.

## Переменные

| Переменная | Обязательно | По умолчанию |
|------------|-------------|--------------|
| `GHOST_URL` | да | `https://your-site.ghost.io` (без `/ghost`) |
| `GHOST_ADMIN_API_KEY` | да | — |
| `HF_TOKEN` | нет | Hugging Face (первый провайдер intro) |
| `HF_TEXT_MODEL` | нет | `Qwen/Qwen3-4B-Instruct-2507` |
| `HF_BASE_URL` | нет | `https://router.huggingface.co/v1` |
| `GROQ_API_KEY` | нет | fallback intro, если HF недоступен |
| `GROQ_MODEL` | нет | `openai/gpt-oss-20b` |
| `GROQ_BASE_URL` | нет | `https://api.groq.com/openai/v1` |
| `OPENAI_API_KEY` | нет | третий запасной OpenAI-compatible ключ |
| `OPENAI_BASE_URL` | нет | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | нет | `gpt-4o-mini` |
| `DIGEST_EXCLUDE_TAG` | нет | не задан — теги не исключаются |
| `FALLBACK_DAYS` | нет | `7` |
| `STATE_FILE` | нет | `state/last-run.json` |

## Инфраструктура

Дополнительных серверов не нужно. Запуск — **GitHub Actions** вручную (расписание отключено).

---

Код подготовлен с помощью Cursor.

Поддержка: [DonationAlerts](https://www.donationalerts.com/r/themarfa) · [NOWPayments](https://nowpayments.io/donation/themarfa)

## Лицензия

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

См. [LICENSE](LICENSE) · https://creativecommons.org/licenses/by-nc-sa/4.0/
