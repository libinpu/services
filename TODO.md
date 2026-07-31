# Plan: Change Brown Color Scheme to Orange

## Information Gathered

The app uses a brown color palette defined in `lib/theme.ts` with `#8B4A12` as the primary brown and `#C58B52` as the light brown. There are also hardcoded brown hex values in:
- `app/(tabs)/index.tsx` - `categoryColors` uses `#EFE8DF` (bg) and `#8B4A12` (fg)
- `app/(tabs)/bookings.tsx` - `getStatusColor` uses `#C58B52` and `#8B4A12`

## Proposed New Palette (Warm Orange)

| Token | Old (Brown) | New (Orange) |
|-------|-------------|--------------|
| primary.50 | #F8F6F2 | #FFF7ED |
| primary.100 | #EFE8DF | #FFEDD5 |
| primary.200 | #EAE4DD | #FED7AA |
| primary.300 | #C58B52 | #FDBA74 |
| primary.400 | #8B4A12 | #FB923C |
| primary.500 | #8B4A12 | #F97316 |
| primary.600 | #8B4A12 | #EA580C |
| primary.700 | #6D3A0E | #C2410C |
| primary.800 | #6D3A0E | #9A3412 |
| primary.900 | #6D3A0E | #7C2D12 |

secondary and accent will mirror primary (as they currently do).

## Steps

- [x] Step 1: Understand codebase - DONE
- [x] Step 2: Update `lib/theme.ts` - change primary/secondary/accent from brown to orange ✅
- [x] Step 3: Update `app/(tabs)/index.tsx` - change hardcoded `categoryColors` (#EFE8DF → #FFEDD5, #8B4A12 → #EA580C) ✅
- [x] Step 4: Update `app/(tabs)/bookings.tsx` - change hardcoded `getStatusColor` (#C58B52 → #FDBA74, #8B4A12 → #EA580C) ✅
- [x] Step 5: Verify no other hardcoded brown values exist - All occurrences updated ✅

