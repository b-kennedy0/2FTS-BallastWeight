# 2FTS Ballast Weight App

The 2FTS Ballast Weight App is a browser-based planning and calculation aid for checking ballast requirements in 2 Flying Training School operations. It is a static web app designed to run through GitHub Pages and uses a bundled aircraft data file to support both individual flight checks and larger passenger-planning tasks.

Live app: [https://2fts-raf.github.io/ballast](https://2fts-raf.github.io/ballast)

Source repository: [https://github.com/b-kennedy0/2FTS-BallastWeight](https://github.com/b-kennedy0/2FTS-BallastWeight)

## What the App Does

The app helps Aircraft Commanders and planners assess whether a passenger load is compatible with aircraft ballast rules and all-up-mass limits for the aircraft data currently held in the project.

It provides two working modes:

- `Single Passenger` mode for checking one Aircraft Commander and one passenger against a selected aircraft.
- `Multiple Passengers` mode for building a passenger list, reviewing ballast requirements across the group, and optionally allocating passengers against selected aircraft configurations.

## Purpose

This app is intended to make routine ballast planning faster, clearer, and easier to review. It brings the aircraft data, passenger inputs, ballast rules, and summary outputs together in one place so the user can:

- assess a single passenger combination quickly
- compare alternative aircraft for the same payload
- review a larger group of passengers in one summary table
- prepare a downloadable PDF for planning or briefing use

## Features

- Single-passenger ballast and all-up-mass checks.
- Alternative aircraft comparison for the same payload.
- Front-seat minimum weight and ballast-status outputs.
- Approach-speed output based on calculated all-up mass.
- Multi-passenger summary with passenger names, weights, required ballast, permitted ballast, and notes.
- Optional aircraft allocation using aircraft-specific commander weights and ballast settings.
- PDF export for the multi-passenger summary.
- Aircraft data loaded from `assets/aircraft_weights.csv`.
- GitHub Issue Form workflow for adding or updating aircraft data entries.

## How to Use the App

### Single Passenger Mode

1. Open the app and remain on `Single Passenger`.
2. Select the aircraft tail number.
3. Enter the Aircraft Commander weight with parachute.
4. Enter the passenger weight with parachute.
5. Select how many ballast weights are fitted.
6. Review the calculations, output checks, and alternative aircraft table.

Single-passenger mode assumes:

- the Aircraft Commander is in the rear seat
- the passenger is in the front seat
- nil carry-on items

### Multiple Passengers Mode

1. Switch to `Multiple Passengers`.
2. Enter the number of passengers to be planned for.
3. Add each passenger name and weight with parachute.
4. Review the summary table showing required ballast, permitted ballast, and status notes.
5. If needed, enable `Set Aircraft Ballasts` and choose the aircraft available for allocation.
6. Enter each selected aircraft's commander weight and ballast setting.
7. Review the aircraft allocation column to see which passengers are allocatable to which configured aircraft.
8. Use `Download PDF` to export the summary.

### Important Input Notes

- Enter weights including parachutes.
- Passenger and commander inputs are capped in the app to prevent invalid values.
- Multi-passenger mode supports up to 50 passengers.
- Outputs depend on the aircraft data currently stored in `assets/aircraft_weights.csv`.

## Aircraft Data and Issue Workflow

Aircraft records are stored in `assets/aircraft_weights.csv`.

New aircraft entries or updates are intended to be submitted through the repository's GitHub Issue Form:

- Issue form: [Add aircraft](https://github.com/b-kennedy0/2FTS-BallastWeight/issues/new?template=add-aircraft.yml)
- You provide the aircraft tail number and aircraft weight in kilograms.
- A GitHub Actions workflow processes the submission.
- If a change is required, the automation opens a pull request to update `assets/aircraft_weights.csv`.
- If the submitted data already matches the CSV, the issue is commented and no pull request is created.

## How to Raise an Issue

The repository currently uses a structured issue process rather than open blank issues.

- For aircraft data additions or corrections, use the [Add aircraft issue form](https://github.com/b-kennedy0/2FTS-BallastWeight/issues/new?template=add-aircraft.yml).
- Check the tail number and weight carefully before submitting.
- If the workflow cannot process the submission automatically, GitHub will comment on the issue with the reason.
- For questions, feedback, or matters that are not aircraft data submissions, use the developer contact route below.

## Developer Contact

Developer: [Dr Bradley Kennedy](https://bradleykennedy.co.uk)

Contact form: [https://bradleykennedy.co.uk/contact](https://bradleykennedy.co.uk/contact)

The repository also includes a GitHub contact link for non-submission questions through the issue page.

## Operational Disclaimer

This tool is provided as an aid to calculation and planning. It does not replace official procedures, aircraft manuals, or operational judgement.

Users are responsible for ensuring all outputs are checked against approved data and guidance.

## Attribution and Citation

The **2FTS Ballast Weight App** was developed by **[Dr Bradley Kennedy](https://bradleykennedy.co.uk)**.

This software is provided to support training and operational planning within 2 Flying Training School.

If this software is reused, adapted, or redistributed, retention of the original copyright notice is required in accordance with the MIT License.

Where appropriate, acknowledgement of the original author in documentation or derivative tools is encouraged.

The app can be cited as follows:

**APA style:**
Kennedy, B. (2026). *2FTS Ballast Weight App* (Version 1.0) [Software]. Available at: https://2fts-raf.github.io/ballast

**BibTeX:**
```bibtex
@software{kennedy2026ballast,
  author = {Kennedy, Bradley},
  title = {2FTS Ballast Weight App},
  year = {2026},
  url = {https://2fts-raf.github.io/ballast}
}
```
