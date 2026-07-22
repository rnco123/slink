# Saludlink — Documentation

Healthcare ecommerce + telemedicine platform. Brand **Saludlink** · **saludlinkusa.com**.

| Doc                                    | What's in it                                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [plan.md](plan.md)                     | Master plan — architecture decisions, the PHI/HIPAA strategy, findings from the 20-site competitive research, site map, delivery phases. |
| [tasks.md](tasks.md)                   | End-to-end task list T1…T40, **design-first**, grouped into phases with verification gates.                                              |
| [legitweb-rules.md](legitweb-rules.md) | LegitScript certification rules distilled into concrete website display requirements, footer trust stack, and build acceptance criteria. |
| [ENVIRONMENT.md](ENVIRONMENT.md)       | Env contract — every variable per service, boot validation rules (zod), and the `pnpm check:env` drift check.                            |
| [MIGRATIONS.md](MIGRATIONS.md)         | Zero-downtime migration rule (expand → migrate → contract) + PR checklist.                                                               |
| [ONBOARDING.md](ONBOARDING.md)         | Fresh-machine setup, everyday commands, and the Windows/PowerShell quirks that bite.                                                     |

**Start here:** read `plan.md` for the "why", then `tasks.md` for the "what/when", checking every user-facing page against `legitweb-rules.md`. New here? Start with `ONBOARDING.md`.
