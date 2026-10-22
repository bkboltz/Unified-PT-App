import {
  runTable,
  hamrTable,
  walkTable,
  pushupsTable,
  hrPushupsTable,
  situpsTable,
  crunchesTable,
  plankTable
} from '../src/data/scoringTables.js';

import {
  getAgeBracket,
  timeToSeconds,
  formatTimeInput,
  roundWaistDown,
  calculateWhtr,
  calculateWhtrDetails,
  evaluateWalk,
  getComponentMinimum,
  calculateCardioScore,
  calculateUpperScore,
  calculateCoreScore,
  calculateCompositeScore
} from '../src/utils/calculator.js';

const brackets = ['u25', '25_29', '30_34', '35_39', '40_44', '45_49', '50_54', '55_59', 'o60'];
const sampleAges = {
  u25: 20,
  '25_29': 27,
  '30_34': 32,
  '35_39': 37,
  '40_44': 42,
  '45_49': 47,
  '50_54': 52,
  '55_59': 57,
  o60: 62
};

// Official USAF Physical Fitness Readiness Assessment Scoring (Effective 1 Mar 26)
const pdfPushups = `
15.0 67 50 63 47 60 44 56 42 52 39 49 36 45 34 42 31 38 28
14.5 66 49 62 46 59 42 55 41 51 38 47 35 44 33 41 30 37 27
14.0 64 47 60 44 57 41 53 40 50 37 46 34 43 32 40 29 36 26
13.5 63 46 59 43 56 40 52 38 49 36 45 33 42 31 39 28 35 25
13.0 61 44 57 42 55 39 51 37 48 35 44 32 41 30 38 27 34 24
12.5 60 43 56 40 53 37 49 36 46 33 43 30 39 29 36 26 33 23
12.0 58 42 55 39 52 36 48 35 45 32 42 29 38 28 35 25 32 22
11.5 57 40 53 38 51 35 47 33 44 31 40 28 37 26 34 24 31 21
11.0 55 39 52 36 49 34 45 32 42 30 39 27 36 25 33 23 30 20
10.5 54 37 50 35 48 32 44 31 41 29 38 26 35 24 32 22 29 19
10.0 52 36 49 34 47 31 43 30 40 27 37 25 34 23 31 21 28 18
9.5 51 35 48 32 45 30 41 28 39 26 36 24 33 22 30 20 27 17
9.0 49 33 46 31 44 29 40 27 37 25 35 23 32 21 29 19 26 16
8.5 48 32 45 30 43 27 39 26 36 24 33 21 30 20 27 17 24 15
8.0 46 30 43 29 41 26 38 25 35 23 32 20 29 19 26 16 23 14
7.5 45 29 42 27 40 25 36 23 33 21 31 19 28 18 25 15 22 13
7.0 43 28 41 26 39 24 35 22 32 20 30 18 27 17 24 14 21 12
6.5 42 26 39 25 37 22 34 21 31 19 29 17 26 16 23 13 20 11
6.0 40 25 38 23 36 21 32 20 30 18 28 16 25 15 22 12 19 10
5.5 39 23 36 22 35 20 31 18 28 17 26 15 24 13 21 11 18 9
5.0 37 22 35 21 33 19 30 17 27 15 25 14 23 12 20 10 17 8
4.5 36 21 34 19 32 17 28 16 26 14 24 12 21 11 18 9 16 7
4.0 34 19 32 18 31 16 27 15 24 13 23 11 20 10 17 8 15 6
3.5 33 18 31 17 29 15 26 13 23 12 22 10 19 9 16 7 14 5
3.0 31 16 29 15 26 14 24 12 22 11 21 9 18 8 15 6 13 4
2.5 30 15 28 14 26 12 23 11 21 10 19 8 17 7 14 5 12 3
`;

const pdfHrPushups = `
15.0 52 42 50 40 48 38 46 36 44 34 42 32 40 30 38 28 36 26
14.5 51 41 49 39 47 37 45 35 43 33 41 31 39 29 37 27 35 25
14.0 50 40 48 38 46 36 44 34 42 32 40 30 38 28 36 26 34 24
13.5 49 39 47 37 45 35 43 33 41 31 39 29 37 27 35 25 33 23
13.0 48 38 46 36 44 34 42 32 40 30 38 28 36 26 34 24 32 22
12.5 47 37 45 35 43 33 41 31 39 29 37 27 35 25 33 23 31 21
12.0 46 36 44 34 42 32 40 30 38 28 36 26 34 24 32 22 30 20
11.5 45 35 43 33 41 31 39 29 37 27 35 25 33 23 31 21 29 19
11.0 44 34 42 32 40 30 38 28 36 26 34 24 32 22 30 20 28 18
10.5 43 33 41 31 39 29 37 27 35 25 33 23 31 21 29 19 27 17
10.0 42 32 40 30 38 28 36 26 34 24 32 22 30 20 28 18 26 16
9.5 41 31 39 29 37 27 35 25 33 23 31 21 29 19 27 17 25 15
9.0 40 30 38 28 36 26 34 24 32 22 30 20 28 18 26 16 24 14
8.5 39 29 37 27 35 25 33 23 31 21 29 19 27 17 25 15 23 13
8.0 38 28 36 26 34 24 32 22 30 20 28 18 26 16 24 14 22 12
7.5 37 27 35 25 33 23 31 21 29 19 27 17 25 15 23 13 21 11
7.0 36 26 34 24 32 22 30 20 28 18 26 16 24 14 22 12 20 10
6.5 35 25 33 23 31 21 29 19 27 17 25 15 23 13 21 11 19 9
6.0 34 24 32 22 30 20 28 18 26 16 24 14 22 12 20 10 18 8
5.5 33 23 31 21 29 19 27 17 25 15 23 13 21 11 19 9 17 7
5.0 32 22 30 20 28 18 26 16 24 14 22 12 20 10 18 8 16 6
4.5 31 21 29 19 27 17 25 15 23 13 21 11 19 9 17 7 15 5
4.0 30 20 28 18 26 16 24 14 22 12 20 10 18 8 16 6 14 4
3.5 29 19 27 17 25 15 23 13 21 11 19 9 17 7 15 5 13 3
3.0 28 18 26 16 24 14 22 12 20 10 18 8 16 6 14 4 12 2
2.5 27 17 25 15 23 13 21 11 19 9 17 7 15 5 13 3 11 1
`;

const pdfSitups = `
15.0 58 54 56 50 54 45 52 43 50 41 48 35 46 34 44 32 42 31
14.5 57 53 55 49 53 44 51 42 49 40 47 34 45 33 43 31 41 30
14.0 56 52 54 48 52 43 50 41 48 39 46 33 44 32 42 30 40 29
13.5 55 51 53 47 51 42 49 40 47 38 45 32 43 31 41 29 39 28
13.0 54 50 52 46 50 41 48 39 46 37 44 31 42 30 40 28 38 27
12.5 53 49 51 45 49 40 47 38 45 36 43 30 41 29 39 27 37 26
12.0 52 48 50 44 48 39 46 37 44 35 42 29 40 28 38 26 36 25
11.5 51 47 49 43 47 38 45 36 43 34 41 28 39 27 37 25 35 24
11.0 50 46 48 42 46 37 44 35 42 33 40 27 38 26 36 24 34 23
10.5 49 45 47 41 45 36 43 34 41 32 39 26 37 25 35 23 33 22
10.0 48 44 46 40 44 35 42 33 40 31 38 25 36 24 34 22 32 21
9.5 47 43 45 39 43 34 41 32 39 30 37 24 35 23 33 21 31 20
9.0 46 42 44 38 42 33 40 31 38 29 36 23 34 22 32 20 30 19
8.5 45 41 43 37 41 32 39 30 37 28 35 22 33 21 31 19 29 18
8.0 44 40 42 36 40 31 38 29 36 27 34 21 32 20 30 18 28 17
7.5 43 39 41 35 39 30 37 28 35 26 33 20 31 19 29 17 27 16
7.0 42 38 40 34 38 29 36 27 34 25 32 19 30 18 28 16 26 15
6.5 41 37 39 33 37 28 35 26 33 24 31 18 29 17 27 15 25 14
6.0 40 36 38 32 36 27 34 25 32 23 30 17 28 16 26 14 24 13
5.5 39 35 37 31 35 26 33 24 31 22 29 16 27 15 25 13 23 12
5.0 38 34 36 30 34 25 32 23 30 21 28 15 26 14 24 12 22 11
4.5 37 33 35 29 33 24 31 22 29 20 27 14 25 13 23 11 21 10
4.0 36 32 34 28 32 23 30 21 28 19 26 13 24 12 22 10 20 9
3.5 35 31 33 27 31 22 29 20 27 18 25 12 23 11 21 9 19 8
3.0 34 30 32 26 30 21 28 19 26 17 24 11 22 10 20 8 18 7
2.5 33 29 31 25 29 20 27 18 25 16 23 10 21 9 19 7 17 6
`;

const pdfCrunches = `
15.0 60 58 58 56 56 54 54 52 52 50 50 48 48 46 46 44 44 42
14.5 59 57 57 55 55 53 53 51 51 49 49 47 47 45 45 43 43 41
14.0 58 56 56 54 54 52 52 50 50 48 48 46 46 44 44 42 42 40
13.5 57 55 55 53 53 51 51 49 49 47 47 45 45 43 43 41 41 39
13.0 56 54 54 52 52 50 50 48 48 46 46 44 44 42 42 40 40 38
12.5 55 53 53 51 51 49 49 47 47 45 45 43 43 41 41 39 39 37
12.0 54 52 52 50 50 48 48 46 46 44 44 42 42 40 40 38 38 36
11.5 53 51 51 49 49 47 47 45 45 43 43 41 41 39 39 37 37 35
11.0 52 50 50 48 48 46 46 44 44 42 42 40 40 38 38 36 36 34
10.5 51 49 49 47 47 45 45 43 43 41 41 39 39 37 37 35 35 33
10.0 50 48 48 46 46 44 44 42 42 40 40 38 38 36 36 34 34 32
9.5 49 47 47 45 45 43 43 41 41 39 39 37 37 35 35 33 33 31
9.0 48 46 46 44 44 42 42 40 40 38 38 36 36 34 34 32 32 30
8.5 47 45 45 43 43 41 41 39 39 37 37 35 35 33 33 31 31 29
8.0 46 44 44 42 42 40 40 38 38 36 36 34 34 32 32 30 30 28
7.5 45 43 43 41 41 39 39 37 37 35 35 33 33 31 31 29 29 27
7.0 44 42 42 40 40 38 38 36 36 34 34 32 32 30 30 28 28 26
6.5 43 41 41 39 39 37 37 35 35 33 33 31 31 29 29 27 27 25
6.0 42 40 40 38 38 36 36 34 34 32 32 30 30 28 28 26 26 24
5.5 41 39 39 37 37 35 35 33 33 31 31 29 29 27 27 25 25 23
5.0 40 38 38 36 36 34 34 32 32 30 30 28 28 26 26 24 24 22
4.5 39 37 37 35 35 33 33 31 31 29 29 27 27 25 25 23 23 21
4.0 38 36 36 34 34 32 32 30 30 28 28 26 26 24 24 22 22 20
3.5 37 35 35 33 33 31 31 29 29 27 27 25 25 23 23 21 21 19
3.0 36 34 34 32 32 30 30 28 28 26 26 24 24 22 22 20 20 18
2.5 35 33 33 31 31 29 29 27 27 25 25 23 23 21 21 19 19 17
`;

const pdfPlank = `
15.0 3:40 3:35 3:35 3:30 3:30 3:25 3:25 3:20 3:20 3:15 3:15 3:10 3:10 3:05 3:05 3:00 3:00 2:55
14.5 3:35 3:30 3:30 3:25 3:25 3:20 3:20 3:15 3:15 3:10 3:10 3:05 3:05 3:00 3:00 2:55 2:55 2:50
14.0 3:30 3:25 3:25 3:20 3:20 3:15 3:15 3:10 3:10 3:05 3:05 3:00 3:00 2:55 2:55 2:50 2:50 2:45
13.5 3:25 3:20 3:20 3:15 3:15 3:10 3:10 3:05 3:05 3:00 3:00 2:55 2:55 2:50 2:50 2:45 2:45 2:40
13.0 3:20 3:15 3:15 3:10 3:10 3:05 3:05 3:00 3:00 2:55 2:55 2:50 2:50 2:45 2:45 2:40 2:40 2:35
12.5 3:15 3:10 3:10 3:05 3:05 3:00 3:00 2:55 2:55 2:50 2:50 2:45 2:45 2:40 2:40 2:35 2:35 2:30
12.0 3:10 3:05 3:05 3:00 3:00 2:55 2:55 2:50 2:50 2:45 2:45 2:40 2:40 2:35 2:35 2:30 2:30 2:25
11.5 3:05 3:00 3:00 2:55 2:55 2:50 2:50 2:45 2:45 2:40 2:40 2:35 2:35 2:30 2:30 2:25 2:25 2:20
11.0 3:00 2:55 2:55 2:50 2:50 2:45 2:45 2:40 2:40 2:35 2:35 2:30 2:30 2:25 2:25 2:20 2:20 2:15
10.5 2:55 2:50 2:50 2:45 2:45 2:40 2:40 2:35 2:35 2:30 2:30 2:25 2:25 2:20 2:20 2:15 2:15 2:10
10.0 2:50 2:45 2:45 2:40 2:40 2:35 2:35 2:30 2:30 2:25 2:25 2:20 2:20 2:15 2:15 2:10 2:10 2:05
9.5 2:45 2:40 2:40 2:35 2:35 2:30 2:30 2:25 2:25 2:20 2:20 2:15 2:15 2:10 2:10 2:05 2:05 2:00
9.0 2:40 2:35 2:35 2:30 2:30 2:25 2:25 2:20 2:20 2:15 2:15 2:10 2:10 2:05 2:05 2:00 2:00 1:55
8.5 2:35 2:30 2:30 2:25 2:25 2:20 2:20 2:15 2:15 2:10 2:10 2:05 2:05 2:00 2:00 1:55 1:55 1:50
8.0 2:30 2:25 2:25 2:20 2:20 2:15 2:15 2:10 2:10 2:05 2:05 2:00 2:00 1:55 1:55 1:50 1:50 1:45
7.5 2:25 2:20 2:20 2:15 2:15 2:10 2:10 2:05 2:05 2:00 2:00 1:55 1:55 1:50 1:50 1:45 1:45 1:40
7.0 2:20 2:15 2:15 2:10 2:10 2:05 2:05 2:00 2:00 1:55 1:55 1:50 1:50 1:45 1:45 1:40 1:40 1:35
6.5 2:15 2:10 2:10 2:05 2:05 2:00 2:00 1:55 1:55 1:50 1:50 1:45 1:45 1:40 1:40 1:35 1:35 1:30
6.0 2:10 2:05 2:05 2:00 2:00 1:55 1:55 1:50 1:50 1:45 1:45 1:40 1:40 1:35 1:35 1:30 1:30 1:25
5.5 2:05 2:00 2:00 1:55 1:55 1:50 1:50 1:45 1:45 1:40 1:40 1:35 1:35 1:30 1:30 1:25 1:25 1:20
5.0 2:00 1:55 1:55 1:50 1:50 1:45 1:45 1:40 1:40 1:35 1:35 1:30 1:30 1:25 1:25 1:20 1:20 1:15
4.5 1:55 1:50 1:50 1:45 1:45 1:40 1:40 1:35 1:35 1:30 1:30 1:25 1:25 1:20 1:20 1:15 1:15 1:10
4.0 1:50 1:45 1:45 1:40 1:40 1:35 1:35 1:30 1:30 1:25 1:25 1:20 1:20 1:15 1:15 1:10 1:10 1:05
3.5 1:45 1:40 1:40 1:35 1:35 1:30 1:30 1:25 1:25 1:20 1:20 1:15 1:15 1:10 1:10 1:05 1:05 1:00
3.0 1:40 1:35 1:35 1:30 1:30 1:25 1:25 1:20 1:20 1:15 1:15 1:10 1:10 1:05 1:05 1:00 1:00 0:55
2.5 1:35 1:30 1:30 1:25 1:25 1:20 1:20 1:15 1:15 1:10 1:10 1:05 1:05 1:00 1:00 0:55 0:55 0:50
`;

const pdfRun = `
50.0 13:25 15:30 13:35 15:55 13:42 16:10 13:56 16:12 14:05 16:45 14:30 16:55 15:09 17:10 15:28 17:43 16:58 18:20
49.5 13:44 16:00 13:54 16:24 14:03 16:40 14:18 16:43 14:29 17:15 14:54 17:26 15:32 17:43 15:52 18:16 17:19 18:54
49.0 14:03 16:29 14:13 16:54 14:24 17:11 14:40 17:14 14:53 17:46 15:18 17:57 15:55 18:16 16:17 18:49 17:40 19:28
48.0 14:22 16:59 14:32 17:23 14:45 17:41 15:02 17:45 15:17 18:16 15:42 18:28 16:18 18:48 16:41 19:22 18:01 20:02
47.0 14:41 17:29 14:51 17:52 15:06 18:11 15:24 18:16 15:41 18:46 16:05 18:59 16:41 19:21 17:06 19:54 18:22 20:36
46.0 15:00 17:58 15:10 18:21 15:28 18:41 15:46 18:47 16:05 19:17 16:29 19:30 17:04 19:54 17:30 20:27 18:44 21:10
45.0 15:19 18:28 15:29 18:51 15:49 19:12 16:08 19:17 16:29 19:47 16:53 20:01 17:27 20:27 17:54 21:00 19:05 21:44
44.0 15:38 18:58 15:48 19:20 16:10 19:42 16:30 19:48 16:53 20:17 17:17 20:32 17:50 20:59 18:19 21:33 19:26 22:18
43.0 15:57 19:27 16:07 19:49 16:31 20:12 16:52 20:19 17:17 20:48 17:41 21:03 18:13 21:32 18:43 22:06 19:47 22:52
42.0 16:16 19:57 16:26 20:18 16:52 20:42 17:14 20:50 17:41 21:18 18:05 21:34 18:36 22:05 19:08 22:39 20:08 23:26
41.0 16:35 20:27 16:45 20:48 17:13 21:13 17:36 21:21 18:05 21:49 18:29 22:05 19:00 22:38 19:32 23:12 20:29 24:00
40.0 16:54 20:56 17:04 21:17 17:34 21:43 17:58 21:52 18:28 22:19 18:52 22:36 19:23 23:10 19:56 23:44 20:50 24:34
39.0 17:13 21:26 17:23 21:46 17:55 22:13 18:20 22:23 18:52 22:49 19:16 23:07 19:46 23:43 20:21 24:17 21:11 25:08
38.5 17:32 21:55 17:42 22:15 18:16 22:43 18:42 22:54 19:16 23:20 19:40 23:38 20:09 24:16 20:45 24:50 21:32 25:42
38.0 17:51 22:25 18:01 22:45 18:37 23:14 19:04 23:25 19:40 23:50 20:04 24:09 20:32 24:49 21:10 25:23 21:53 26:16
37.5 18:10 22:55 18:20 23:14 18:59 23:44 19:26 23:56 20:04 24:20 20:28 24:40 20:55 25:21 21:34 25:56 22:15 26:50
37.0 18:29 23:24 18:39 23:43 19:20 24:14 19:48 24:26 20:28 24:51 20:52 25:11 21:18 25:54 21:58 26:29 22:27 27:24
36.5 18:48 23:54 18:58 24:12 19:41 24:44 20:10 24:57 20:52 25:21 21:15 25:42 21:41 26:27 22:23 27:01 22:36 27:58
36.0 19:07 24:24 19:17 24:42 20:02 25:15 20:32 25:28 21:16 25:51 21:39 26:13 22:04 27:00 22:47 27:34 23:18 28:32
35.5 19:36 24:53 19:36 25:11 20:23 25:45 20:54 25:59 21:40 26:22 22:03 26:44 22:27 27:32 23:12 28:07 23:39 29:06
35.0 19:45 25:23 19:55 25:40 20:44 26:15 21:16 26:30 22:04 26:52 22:27 27:15 22:50 28:05 23:36 28:40 24:00 29:40
`;

const pdfHamr = `
50.0 87 68 85 65 84 63 82 63 81 59 77 58 71 57 69 53 65 50
49.5 84 65 82 62 81 60 79 60 77 56 73 55 68 53 66 50 62 47
49.0 81 61 79 58 78 57 75 56 73 53 70 52 65 50 63 47 59 44
48.0 78 58 76 55 75 53 72 53 70 50 67 49 62 47 60 44 56 41
47.0 75 55 74 52 72 51 69 50 67 47 64 46 60 44 57 42 54 38
46.0 72 52 71 50 69 48 66 47 64 45 61 44 57 42 55 39 52 36
45.0 70 49 69 47 66 45 64 45 61 42 58 41 55 39 52 37 49 34
44.0 67 46 66 44 63 43 61 42 58 40 56 39 53 37 50 34 47 32
43.0 65 44 64 42 61 40 59 40 56 38 53 37 50 35 48 32 45 29
42.0 63 41 62 40 59 38 56 37 53 35 51 34 48 32 45 30 43 27
41.0 60 39 59 38 56 36 54 35 51 33 49 32 46 30 43 28 41 26
40.0 58 37 57 36 54 34 52 33 49 31 47 30 44 28 41 26 39 24
39.0 56 35 55 34 52 32 50 31 47 30 45 29 42 26 40 25 38 22
38.5 54 33 53 32 50 30 48 29 45 28 43 27 40 25 38 23 36 20
38.0 52 31 52 30 48 28 46 28 43 26 41 25 39 23 36 21 34 19
37.5 51 29 50 28 46 26 44 26 41 24 39 23 37 21 34 20 33 18
37.0 49 28 48 26 44 25 42 24 39 23 37 22 35 20 33 18 31 17
36.5 47 26 46 25 43 23 40 23 37 21 36 20 34 18 31 17 30 14
36.0 46 24 45 23 41 22 39 21 36 20 34 19 32 17 30 15 28 13
35.5 44 23 43 22 39 20 37 20 34 19 32 18 31 16 28 14 27 12
35.0 42 21 42 20 38 19 36 18 32 17 31 16 30 14 27 13 26 11
`;

let passedTests = 0;
let failedTests = 0;

function assertEqual(actual, expected, msg) {
  if (actual === expected) {
    passedTests++;
  } else {
    failedTests++;
    console.error(`❌ FAIL: ${msg} | Expected: ${expected}, Got: ${actual}`);
  }
}

function secondsToMMSS(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function verifyTable(name, pdfRaw, codeTable, isStringVal = false) {
  const lines = pdfRaw.trim().split('\n').map(l => l.trim()).filter(Boolean);
  for (let r = 0; r < lines.length; r++) {
    const parts = lines[r].split(/\s+/);
    const pts = parseFloat(parts[0]);
    for (let bIdx = 0; bIdx < 9; bIdx++) {
      const bracket = brackets[bIdx];
      const expectedM = isStringVal ? parts[1 + bIdx * 2] : parseInt(parts[1 + bIdx * 2], 10);
      const expectedF = isStringVal ? parts[2 + bIdx * 2] : parseInt(parts[2 + bIdx * 2], 10);
      const codeRow = codeTable[bracket][r];
      assertEqual(codeRow.p, pts, `${name}[${bracket}][${r}] points`);
      assertEqual(codeRow.m, expectedM, `${name}[${bracket}] (pts=${pts}) Male`);
      assertEqual(codeRow.f, expectedF, `${name}[${bracket}] (pts=${pts}) Female`);
    }
  }
}

// 1. Verify all 3,096 table data points against official USAF PFRA Scoring Charts
verifyTable('2-Mile Run', pdfRun, runTable, true);
verifyTable('20m HAMR', pdfHamr, hamrTable, false);
verifyTable('Push-ups', pdfPushups, pushupsTable, false);
verifyTable('Hand-Release Push-ups', pdfHrPushups, hrPushupsTable, false);
verifyTable('Sit-ups', pdfSitups, situpsTable, false);
verifyTable('Cross-Leg Reverse Crunch', pdfCrunches, crunchesTable, false);
verifyTable('Forearm Plank', pdfPlank, plankTable, true);

// 2. Verify age brackets for ages 17..80
for (let age = 17; age <= 80; age++) {
  const expected =
    age < 25 ? 'u25' :
    age <= 29 ? '25_29' :
    age <= 34 ? '30_34' :
    age <= 39 ? '35_39' :
    age <= 44 ? '40_44' :
    age <= 49 ? '45_49' :
    age <= 54 ? '50_54' :
    age <= 59 ? '55_59' : 'o60';
  assertEqual(getAgeBracket(age), expected, `getAgeBracket(${age})`);
}

// 3. Verify boundary conditions across all 7 events, 9 age brackets, 2 genders
for (const b of brackets) {
  const age = sampleAges[b];
  for (const gender of ['male', 'female']) {
    const gKey = gender === 'male' ? 'm' : 'f';

    for (let i = 0; i < runTable[b].length; i++) {
      const row = runTable[b][i];
      const sec = timeToSeconds(row[gKey]);
      assertEqual(calculateCardioScore('run', gender, age, row[gKey]), row.p, `Run exact [${b}][${gender}]`);
      const expectedSlowerPts = i + 1 < runTable[b].length ? runTable[b][i + 1].p : 0;
      assertEqual(calculateCardioScore('run', gender, age, secondsToMMSS(sec + 1)), expectedSlowerPts, `Run +1s [${b}][${gender}]`);
    }

    for (let i = 0; i < hamrTable[b].length; i++) {
      const row = hamrTable[b][i];
      const reps = row[gKey];
      assertEqual(calculateCardioScore('hamr', gender, age, String(reps)), row.p, `HAMR exact [${b}][${gender}]`);
      const lowerReps = reps - 1;
      const expectedLowerPts = i + 1 < hamrTable[b].length ? (lowerReps >= hamrTable[b][i + 1][gKey] ? hamrTable[b][i + 1].p : 0) : 0;
      assertEqual(calculateCardioScore('hamr', gender, age, String(lowerReps)), expectedLowerPts, `HAMR -1 [${b}][${gender}]`);
    }

    for (let i = 0; i < pushupsTable[b].length; i++) {
      const row = pushupsTable[b][i];
      const reps = row[gKey];
      const expectedExact = pushupsTable[b].find(r => reps >= r[gKey]).p;
      assertEqual(calculateUpperScore('pushups', gender, age, String(reps)), expectedExact, `Pushups exact [${b}][${gender}]`);
      if (i === pushupsTable[b].length - 1) {
        assertEqual(calculateUpperScore('pushups', gender, age, String(reps - 1)), 0, `Pushups below min [${b}][${gender}]`);
      }
    }

    for (let i = 0; i < hrPushupsTable[b].length; i++) {
      const row = hrPushupsTable[b][i];
      const reps = row[gKey];
      assertEqual(calculateUpperScore('hrPushups', gender, age, String(reps)), row.p, `HR Pushups exact [${b}][${gender}]`);
      if (i === hrPushupsTable[b].length - 1) {
        assertEqual(calculateUpperScore('hrPushups', gender, age, String(reps - 1)), 0, `HR Pushups below min [${b}][${gender}]`);
      }
    }

    for (let i = 0; i < situpsTable[b].length; i++) {
      const row = situpsTable[b][i];
      const reps = row[gKey];
      assertEqual(calculateCoreScore('situps', gender, age, String(reps)), row.p, `Situps exact [${b}][${gender}]`);
      if (i === situpsTable[b].length - 1) {
        assertEqual(calculateCoreScore('situps', gender, age, String(reps - 1)), 0, `Situps below min [${b}][${gender}]`);
      }
    }

    for (let i = 0; i < crunchesTable[b].length; i++) {
      const row = crunchesTable[b][i];
      const reps = row[gKey];
      assertEqual(calculateCoreScore('crunches', gender, age, String(reps)), row.p, `Crunches exact [${b}][${gender}]`);
      if (i === crunchesTable[b].length - 1) {
        assertEqual(calculateCoreScore('crunches', gender, age, String(reps - 1)), 0, `Crunches below min [${b}][${gender}]`);
      }
    }

    for (let i = 0; i < plankTable[b].length; i++) {
      const row = plankTable[b][i];
      const sec = timeToSeconds(row[gKey], 0);
      assertEqual(calculateCoreScore('plank', gender, age, row[gKey]), row.p, `Plank exact [${b}][${gender}]`);
      const expectedShorterPts = i + 1 < plankTable[b].length ? plankTable[b][i + 1].p : 0;
      assertEqual(calculateCoreScore('plank', gender, age, secondsToMMSS(sec - 1)), expectedShorterPts, `Plank -1s [${b}][${gender}]`);
    }
  }
}

// 4. Verify sub-minute plank formats (":55", "55", "0:55", ":50", "50", "0:50")
assertEqual(calculateCoreScore('plank', 'female', 62, ':50'), 2.5, 'Plank ":50" o60 female');
assertEqual(calculateCoreScore('plank', 'female', 62, '50'), 2.5, 'Plank "50" o60 female');
assertEqual(calculateCoreScore('plank', 'female', 62, '0:50'), 2.5, 'Plank "0:50" o60 female');
assertEqual(calculateCoreScore('plank', 'female', 62, '49'), 0, 'Plank "49" o60 female below min');

// 5. Verify WHtR truncation & 0.5" waist rounding down (DAFMAN 36-2905 example: 39.5 / 72 = 0.5486 -> 0.54 -> 15 pts)
assertEqual(calculateWhtr(72, 39.5), 15, 'DAFMAN 36-2905 example 39.5" / 72" = 0.5486 -> 0.54 -> 15 pts');
assertEqual(roundWaistDown(34.25), 34.0, 'Waist 34.25" rounds down to 34.0"');
assertEqual(roundWaistDown(34.75), 34.5, 'Waist 34.75" rounds down to 34.5"');
const whtrDet1 = calculateWhtrDetails(72, 39.5);
assertEqual(whtrDet1.ratioFormatted, '0.54', 'WHtR ratio formatted 0.54');
assertEqual(whtrDet1.risk, 'Moderate Risk', 'WHtR 0.54 is Moderate Risk');
const whtrDet2 = calculateWhtrDetails(72, 35.0);
assertEqual(whtrDet2.risk, 'Low Risk', 'WHtR <= 0.49 is Low Risk');
const whtrDet3 = calculateWhtrDetails(72, 40.0);
assertEqual(whtrDet3.risk, 'High Risk', 'WHtR >= 0.55 is High Risk');

// 6. Verify 2.0km Walk (Page 11 of PFRA Scoring Charts.pdf)
const expectedWalk = {
  u25: { m: '16:16', f: '17:22' },
  '25_29': { m: '16:16', f: '17:22' },
  '30_34': { m: '16:18', f: '17:28' },
  '35_39': { m: '16:18', f: '17:28' },
  '40_44': { m: '16:23', f: '17:49' },
  '45_49': { m: '16:23', f: '17:49' },
  '50_54': { m: '16:40', f: '18:11' },
  '55_59': { m: '16:40', f: '18:11' },
  o60: { m: '16:58', f: '18:53' }
};
for (const b of brackets) {
  const age = sampleAges[b];
  assertEqual(walkTable[b].m, expectedWalk[b].m, `Walk table [${b}] Male`);
  assertEqual(walkTable[b].f, expectedWalk[b].f, `Walk table [${b}] Female`);
  for (const gender of ['male', 'female']) {
    const gKey = gender === 'male' ? 'm' : 'f';
    const maxStr = expectedWalk[b][gKey];
    const maxSec = timeToSeconds(maxStr);
    assertEqual(evaluateWalk(gender, age, maxStr).passed, true, `Walk exact max [${b}][${gender}]`);
    assertEqual(evaluateWalk(gender, age, secondsToMMSS(maxSec + 1)).passed, false, `Walk +1s over max [${b}][${gender}]`);
  }
}

// 7. Verify Composite Score scaling & pass/fail rules
const comp1 = calculateCompositeScore({ whtr: 0, cardio: 50, upper: 15, core: 15 });
assertEqual(comp1.total, 80, 'WHtR 0 points still passes if composite >= 75');
assertEqual(comp1.passed, true, 'WHtR has no minimum component threshold');

const comp2 = calculateCompositeScore({ whtr: 20, cardio: 50, upper: 15, core: 0 });
assertEqual(comp2.total, 85, 'Zero on core has 85 total');
assertEqual(comp2.passed, false, 'Zero on core fails due to minimum component threshold');

const comp3 = calculateCompositeScore(
  { whtr: 0, cardio: 35, upper: 8, core: 8 },
  { whtr: true, cardio: false, upper: false, core: false }
);
assertEqual(comp3.total, 63.8, '51 / 80 * 100 = 63.75 rounds up to 63.8');

const compWalkPass = calculateCompositeScore({
  whtr: 20,
  cardio: 0,
  upper: 10,
  core: 10,
  cardioType: 'walk',
  walkPassed: true
});
assertEqual(compWalkPass.possiblePoints, 50, '2.0km Walk scales remaining components out of 50');
assertEqual(compWalkPass.total, 80, '40 / 50 * 100 = 80.0');
assertEqual(compWalkPass.passed, true, 'Passing walk + 80 composite passes');

const compWalkFail = calculateCompositeScore({
  whtr: 20,
  cardio: 0,
  upper: 15,
  core: 15,
  cardioType: 'walk',
  walkPassed: false
});
assertEqual(compWalkFail.total, 100, '50 / 50 * 100 = 100.0');
assertEqual(compWalkFail.passed, false, 'Failing walk fails composite even with 100 on other components');

console.log(`✅ All ${passedTests} assertions passed (${failedTests} failed).`);
if (failedTests > 0) process.exit(1);
