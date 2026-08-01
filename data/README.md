# Referred-clients CSV drop

The sync worker (`pnpm sync`) reads `<broker>.csv` from this directory (path set by
`SYNC_CSV_DIR`) and upserts the rows into `referred_client`. This is the manual
"floor" source — export your referred clients from the broker's IB/partner portal,
save the file here as `vantage.csv` / `exness.csv` / `xm.csv`, and the next tick
ingests it.

## Format

A header row plus one row per client. Column names are matched flexibly:

- **identifier** (required): one of `identifier`, `uid`, `email`, `account`, `login`
- **deposits** (optional): one of `deposits`, `deposit`, `funded`, `balance`, `funds`
- **volume** (optional): one of `volume`, `lots`, `volume_lots`, `traded_lots`

Example (`exness.csv`):

```csv
email,deposits,volume
alice@example.com,250.00,0.8
bob@example.com,120,0.2
```

Example (`vantage.csv`):

```csv
uid,funded,lots
1048201,300,1.5
1048999,50,0.05
```

Real per-broker exports are not committed — only this doc and the format live here.
