// ============================================================
    // Constants and default data
    // ============================================================

    // Atmospheric pressure is used only when converting between
    // absolute pressure and gauge pressure for state properties.
    const ATM_PRESSURE_PA = 101325.0;

    // Explicit conversion constants make the math easier to audit.
    const PSI_TO_PA = 6894.757293168;
    const KPA_TO_PA = 1000.0;
    const FT_TO_M = 0.3048;
    const IN_TO_M = 0.0254;
    const MM_TO_M = 0.001;
    const LB_TO_KG = 0.45359237;
    const KG_TO_LB = 1.0 / LB_TO_KG;
    const US_GPM_TO_M3S = 0.0000630901964;
    const BTUH_TO_W = 0.29307107;
    const TONR_TO_W = 3516.8528420667;
    const KG_M3_TO_LB_FT3 = 0.0624279606;
    const MPS_TO_FPS = 3.280839895;
    const M2_TO_FT2 = 10.763910417;
    const M2_TO_IN2 = 1550.0031;
    const PA_S_TO_CP = 1000.0;

    // Saturation-property columns extracted from the uploaded PDF.
    const DEFAULT_SATURATION_ROWS = [
  {
    "tempC": -50,
    "pressureKPa": 37.423,
    "rhoL": 1318.4,
    "rhoV": 2.355,
    "hfgKJkg": 190.2
  },
  {
    "tempC": -49,
    "pressureKPa": 39.477,
    "rhoL": 1315.8,
    "rhoV": 2.475,
    "hfgKJkg": 189.8
  },
  {
    "tempC": -48,
    "pressureKPa": 41.622,
    "rhoL": 1313.2,
    "rhoV": 2.6,
    "hfgKJkg": 189.3
  },
  {
    "tempC": -47,
    "pressureKPa": 43.859,
    "rhoL": 1310.5,
    "rhoV": 2.731,
    "hfgKJkg": 188.8
  },
  {
    "tempC": -46,
    "pressureKPa": 46.192,
    "rhoL": 1307.9,
    "rhoV": 2.866,
    "hfgKJkg": 188.4
  },
  {
    "tempC": -45,
    "pressureKPa": 48.624,
    "rhoL": 1305.2,
    "rhoV": 3.007,
    "hfgKJkg": 187.9
  },
  {
    "tempC": -44,
    "pressureKPa": 51.157,
    "rhoL": 1302.6,
    "rhoV": 3.153,
    "hfgKJkg": 187.4
  },
  {
    "tempC": -43,
    "pressureKPa": 53.795,
    "rhoL": 1299.9,
    "rhoV": 3.305,
    "hfgKJkg": 186.9
  },
  {
    "tempC": -42,
    "pressureKPa": 56.54,
    "rhoL": 1297.2,
    "rhoV": 3.462,
    "hfgKJkg": 186.5
  },
  {
    "tempC": -41,
    "pressureKPa": 59.397,
    "rhoL": 1294.6,
    "rhoV": 3.625,
    "hfgKJkg": 186.0
  },
  {
    "tempC": -40,
    "pressureKPa": 62.367,
    "rhoL": 1291.9,
    "rhoV": 3.795,
    "hfgKJkg": 185.5
  },
  {
    "tempC": -39,
    "pressureKPa": 65.454,
    "rhoL": 1289.2,
    "rhoV": 3.97,
    "hfgKJkg": 185.0
  },
  {
    "tempC": -38,
    "pressureKPa": 68.661,
    "rhoL": 1286.5,
    "rhoV": 4.152,
    "hfgKJkg": 184.5
  },
  {
    "tempC": -37,
    "pressureKPa": 71.992,
    "rhoL": 1283.8,
    "rhoV": 4.34,
    "hfgKJkg": 184.0
  },
  {
    "tempC": -36,
    "pressureKPa": 75.45,
    "rhoL": 1281.0,
    "rhoV": 4.535,
    "hfgKJkg": 183.5
  },
  {
    "tempC": -35,
    "pressureKPa": 79.039,
    "rhoL": 1278.3,
    "rhoV": 4.737,
    "hfgKJkg": 183.0
  },
  {
    "tempC": -34,
    "pressureKPa": 82.761,
    "rhoL": 1275.6,
    "rhoV": 4.946,
    "hfgKJkg": 182.5
  },
  {
    "tempC": -33,
    "pressureKPa": 86.62,
    "rhoL": 1272.8,
    "rhoV": 5.162,
    "hfgKJkg": 182.0
  },
  {
    "tempC": -32,
    "pressureKPa": 90.62,
    "rhoL": 1270.1,
    "rhoV": 5.386,
    "hfgKJkg": 181.5
  },
  {
    "tempC": -31,
    "pressureKPa": 94.764,
    "rhoL": 1267.3,
    "rhoV": 5.617,
    "hfgKJkg": 181.0
  },
  {
    "tempC": -30,
    "pressureKPa": 99.056,
    "rhoL": 1264.5,
    "rhoV": 5.855,
    "hfgKJkg": 180.5
  },
  {
    "tempC": -29,
    "pressureKPa": 103.5,
    "rhoL": 1261.8,
    "rhoV": 6.102,
    "hfgKJkg": 180.0
  },
  {
    "tempC": -28,
    "pressureKPa": 108.098,
    "rhoL": 1259.0,
    "rhoV": 6.357,
    "hfgKJkg": 179.5
  },
  {
    "tempC": -27,
    "pressureKPa": 112.856,
    "rhoL": 1256.2,
    "rhoV": 6.62,
    "hfgKJkg": 178.9
  },
  {
    "tempC": -26,
    "pressureKPa": 117.775,
    "rhoL": 1253.4,
    "rhoV": 6.891,
    "hfgKJkg": 178.4
  },
  {
    "tempC": -25,
    "pressureKPa": 122.861,
    "rhoL": 1250.5,
    "rhoV": 7.171,
    "hfgKJkg": 177.9
  },
  {
    "tempC": -24,
    "pressureKPa": 128.117,
    "rhoL": 1247.7,
    "rhoV": 7.46,
    "hfgKJkg": 177.4
  },
  {
    "tempC": -23,
    "pressureKPa": 133.548,
    "rhoL": 1244.9,
    "rhoV": 7.758,
    "hfgKJkg": 176.8
  },
  {
    "tempC": -22,
    "pressureKPa": 139.155,
    "rhoL": 1242.0,
    "rhoV": 8.066,
    "hfgKJkg": 176.3
  },
  {
    "tempC": -21,
    "pressureKPa": 144.945,
    "rhoL": 1239.2,
    "rhoV": 8.383,
    "hfgKJkg": 175.7
  },
  {
    "tempC": -20,
    "pressureKPa": 150.921,
    "rhoL": 1236.3,
    "rhoV": 8.709,
    "hfgKJkg": 175.2
  },
  {
    "tempC": -19,
    "pressureKPa": 157.086,
    "rhoL": 1233.4,
    "rhoV": 9.046,
    "hfgKJkg": 174.6
  },
  {
    "tempC": -18,
    "pressureKPa": 163.444,
    "rhoL": 1230.5,
    "rhoV": 9.392,
    "hfgKJkg": 174.1
  },
  {
    "tempC": -17,
    "pressureKPa": 170.001,
    "rhoL": 1227.6,
    "rhoV": 9.75,
    "hfgKJkg": 173.5
  },
  {
    "tempC": -16,
    "pressureKPa": 176.759,
    "rhoL": 1224.7,
    "rhoV": 10.117,
    "hfgKJkg": 172.9
  },
  {
    "tempC": -15,
    "pressureKPa": 183.724,
    "rhoL": 1221.8,
    "rhoV": 10.496,
    "hfgKJkg": 172.4
  },
  {
    "tempC": -14,
    "pressureKPa": 190.898,
    "rhoL": 1218.8,
    "rhoV": 10.885,
    "hfgKJkg": 171.8
  },
  {
    "tempC": -13,
    "pressureKPa": 198.287,
    "rhoL": 1215.9,
    "rhoV": 11.286,
    "hfgKJkg": 171.2
  },
  {
    "tempC": -12,
    "pressureKPa": 205.895,
    "rhoL": 1212.9,
    "rhoV": 11.699,
    "hfgKJkg": 170.6
  },
  {
    "tempC": -11,
    "pressureKPa": 213.726,
    "rhoL": 1209.9,
    "rhoV": 12.123,
    "hfgKJkg": 170.0
  },
  {
    "tempC": -10,
    "pressureKPa": 221.783,
    "rhoL": 1207.0,
    "rhoV": 12.559,
    "hfgKJkg": 169.5
  },
  {
    "tempC": -9,
    "pressureKPa": 230.072,
    "rhoL": 1203.9,
    "rhoV": 13.008,
    "hfgKJkg": 168.9
  },
  {
    "tempC": -8,
    "pressureKPa": 238.597,
    "rhoL": 1200.9,
    "rhoV": 13.469,
    "hfgKJkg": 168.3
  },
  {
    "tempC": -7,
    "pressureKPa": 247.363,
    "rhoL": 1197.9,
    "rhoV": 13.943,
    "hfgKJkg": 167.7
  },
  {
    "tempC": -6,
    "pressureKPa": 256.373,
    "rhoL": 1194.9,
    "rhoV": 14.431,
    "hfgKJkg": 167.0
  },
  {
    "tempC": -5,
    "pressureKPa": 265.632,
    "rhoL": 1191.8,
    "rhoV": 14.931,
    "hfgKJkg": 166.4
  },
  {
    "tempC": -4,
    "pressureKPa": 275.144,
    "rhoL": 1188.7,
    "rhoV": 15.446,
    "hfgKJkg": 165.8
  },
  {
    "tempC": -3,
    "pressureKPa": 284.915,
    "rhoL": 1185.6,
    "rhoV": 15.974,
    "hfgKJkg": 165.2
  },
  {
    "tempC": -2,
    "pressureKPa": 294.948,
    "rhoL": 1182.5,
    "rhoV": 16.517,
    "hfgKJkg": 164.6
  },
  {
    "tempC": -1,
    "pressureKPa": 305.249,
    "rhoL": 1179.4,
    "rhoV": 17.074,
    "hfgKJkg": 163.9
  },
  {
    "tempC": 0,
    "pressureKPa": 315.821,
    "rhoL": 1176.3,
    "rhoV": 17.647,
    "hfgKJkg": 163.3
  },
  {
    "tempC": 1,
    "pressureKPa": 326.67,
    "rhoL": 1173.1,
    "rhoV": 18.234,
    "hfgKJkg": 162.6
  },
  {
    "tempC": 2,
    "pressureKPa": 337.8,
    "rhoL": 1170.0,
    "rhoV": 18.837,
    "hfgKJkg": 162.0
  },
  {
    "tempC": 3,
    "pressureKPa": 349.216,
    "rhoL": 1166.8,
    "rhoV": 19.457,
    "hfgKJkg": 161.3
  },
  {
    "tempC": 4,
    "pressureKPa": 360.923,
    "rhoL": 1163.6,
    "rhoV": 20.092,
    "hfgKJkg": 160.7
  },
  {
    "tempC": 5,
    "pressureKPa": 372.925,
    "rhoL": 1160.4,
    "rhoV": 20.744,
    "hfgKJkg": 160.0
  },
  {
    "tempC": 6,
    "pressureKPa": 385.227,
    "rhoL": 1157.2,
    "rhoV": 21.413,
    "hfgKJkg": 159.3
  },
  {
    "tempC": 7,
    "pressureKPa": 397.833,
    "rhoL": 1153.9,
    "rhoV": 22.1,
    "hfgKJkg": 158.7
  },
  {
    "tempC": 8,
    "pressureKPa": 410.75,
    "rhoL": 1150.6,
    "rhoV": 22.804,
    "hfgKJkg": 158.0
  },
  {
    "tempC": 9,
    "pressureKPa": 423.981,
    "rhoL": 1147.3,
    "rhoV": 23.526,
    "hfgKJkg": 157.3
  },
  {
    "tempC": 10,
    "pressureKPa": 437.532,
    "rhoL": 1144.0,
    "rhoV": 24.267,
    "hfgKJkg": 156.6
  },
  {
    "tempC": 11,
    "pressureKPa": 451.408,
    "rhoL": 1140.7,
    "rhoV": 25.027,
    "hfgKJkg": 155.9
  },
  {
    "tempC": 12,
    "pressureKPa": 465.613,
    "rhoL": 1137.4,
    "rhoV": 25.807,
    "hfgKJkg": 155.2
  },
  {
    "tempC": 13,
    "pressureKPa": 480.152,
    "rhoL": 1134.0,
    "rhoV": 26.606,
    "hfgKJkg": 154.5
  },
  {
    "tempC": 14,
    "pressureKPa": 495.031,
    "rhoL": 1130.6,
    "rhoV": 27.425,
    "hfgKJkg": 153.8
  },
  {
    "tempC": 15,
    "pressureKPa": 510.255,
    "rhoL": 1127.2,
    "rhoV": 28.266,
    "hfgKJkg": 153.0
  },
  {
    "tempC": 16,
    "pressureKPa": 525.828,
    "rhoL": 1123.8,
    "rhoV": 29.127,
    "hfgKJkg": 152.3
  },
  {
    "tempC": 17,
    "pressureKPa": 541.756,
    "rhoL": 1120.3,
    "rhoV": 30.011,
    "hfgKJkg": 151.6
  },
  {
    "tempC": 18,
    "pressureKPa": 558.044,
    "rhoL": 1116.9,
    "rhoV": 30.916,
    "hfgKJkg": 150.8
  },
  {
    "tempC": 19,
    "pressureKPa": 574.697,
    "rhoL": 1113.4,
    "rhoV": 31.845,
    "hfgKJkg": 150.1
  },
  {
    "tempC": 20,
    "pressureKPa": 591.721,
    "rhoL": 1109.9,
    "rhoV": 32.796,
    "hfgKJkg": 149.3
  },
  {
    "tempC": 21,
    "pressureKPa": 609.12,
    "rhoL": 1106.3,
    "rhoV": 33.772,
    "hfgKJkg": 148.5
  },
  {
    "tempC": 22,
    "pressureKPa": 626.901,
    "rhoL": 1102.8,
    "rhoV": 34.772,
    "hfgKJkg": 147.7
  },
  {
    "tempC": 23,
    "pressureKPa": 645.068,
    "rhoL": 1099.2,
    "rhoV": 35.797,
    "hfgKJkg": 147.0
  },
  {
    "tempC": 24,
    "pressureKPa": 663.626,
    "rhoL": 1095.5,
    "rhoV": 36.848,
    "hfgKJkg": 146.2
  },
  {
    "tempC": 25,
    "pressureKPa": 682.582,
    "rhoL": 1091.9,
    "rhoV": 37.925,
    "hfgKJkg": 145.4
  },
  {
    "tempC": 26,
    "pressureKPa": 701.94,
    "rhoL": 1088.2,
    "rhoV": 39.029,
    "hfgKJkg": 144.6
  },
  {
    "tempC": 27,
    "pressureKPa": 721.707,
    "rhoL": 1084.5,
    "rhoV": 40.161,
    "hfgKJkg": 143.7
  },
  {
    "tempC": 28,
    "pressureKPa": 741.887,
    "rhoL": 1080.8,
    "rhoV": 41.321,
    "hfgKJkg": 142.9
  },
  {
    "tempC": 29,
    "pressureKPa": 762.487,
    "rhoL": 1077.1,
    "rhoV": 42.51,
    "hfgKJkg": 142.1
  },
  {
    "tempC": 30,
    "pressureKPa": 783.511,
    "rhoL": 1073.3,
    "rhoV": 43.729,
    "hfgKJkg": 141.2
  },
  {
    "tempC": 31,
    "pressureKPa": 804.966,
    "rhoL": 1069.5,
    "rhoV": 44.979,
    "hfgKJkg": 140.4
  },
  {
    "tempC": 32,
    "pressureKPa": 826.857,
    "rhoL": 1065.7,
    "rhoV": 46.26,
    "hfgKJkg": 139.5
  },
  {
    "tempC": 33,
    "pressureKPa": 849.19,
    "rhoL": 1061.8,
    "rhoV": 47.573,
    "hfgKJkg": 138.7
  },
  {
    "tempC": 34,
    "pressureKPa": 871.971,
    "rhoL": 1057.9,
    "rhoV": 48.92,
    "hfgKJkg": 137.8
  },
  {
    "tempC": 35,
    "pressureKPa": 895.206,
    "rhoL": 1054.0,
    "rhoV": 50.301,
    "hfgKJkg": 136.9
  },
  {
    "tempC": 36,
    "pressureKPa": 918.9,
    "rhoL": 1050.0,
    "rhoV": 51.717,
    "hfgKJkg": 136.0
  },
  {
    "tempC": 37,
    "pressureKPa": 943.06,
    "rhoL": 1046.0,
    "rhoV": 53.169,
    "hfgKJkg": 135.1
  },
  {
    "tempC": 38,
    "pressureKPa": 967.691,
    "rhoL": 1042.0,
    "rhoV": 54.658,
    "hfgKJkg": 134.1
  },
  {
    "tempC": 39,
    "pressureKPa": 992.8,
    "rhoL": 1037.9,
    "rhoV": 56.186,
    "hfgKJkg": 133.2
  },
  {
    "tempC": 40,
    "pressureKPa": 1018.393,
    "rhoL": 1033.8,
    "rhoV": 57.753,
    "hfgKJkg": 132.3
  },
  {
    "tempC": 41,
    "pressureKPa": 1044.476,
    "rhoL": 1029.6,
    "rhoV": 59.36,
    "hfgKJkg": 131.3
  },
  {
    "tempC": 42,
    "pressureKPa": 1071.055,
    "rhoL": 1025.5,
    "rhoV": 61.01,
    "hfgKJkg": 130.3
  },
  {
    "tempC": 43,
    "pressureKPa": 1098.137,
    "rhoL": 1021.2,
    "rhoV": 62.702,
    "hfgKJkg": 129.4
  },
  {
    "tempC": 44,
    "pressureKPa": 1125.728,
    "rhoL": 1017.0,
    "rhoV": 64.44,
    "hfgKJkg": 128.4
  },
  {
    "tempC": 45,
    "pressureKPa": 1153.834,
    "rhoL": 1012.6,
    "rhoV": 66.223,
    "hfgKJkg": 127.4
  },
  {
    "tempC": 46,
    "pressureKPa": 1182.462,
    "rhoL": 1008.3,
    "rhoV": 68.053,
    "hfgKJkg": 126.3
  },
  {
    "tempC": 47,
    "pressureKPa": 1211.618,
    "rhoL": 1003.9,
    "rhoV": 69.933,
    "hfgKJkg": 125.3
  },
  {
    "tempC": 48,
    "pressureKPa": 1241.31,
    "rhoL": 999.4,
    "rhoV": 71.863,
    "hfgKJkg": 124.3
  },
  {
    "tempC": 49,
    "pressureKPa": 1271.543,
    "rhoL": 994.9,
    "rhoV": 73.846,
    "hfgKJkg": 123.2
  },
  {
    "tempC": 50,
    "pressureKPa": 1302.325,
    "rhoL": 990.4,
    "rhoV": 75.884,
    "hfgKJkg": 122.1
  },
  {
    "tempC": 51,
    "pressureKPa": 1333.663,
    "rhoL": 985.8,
    "rhoV": 77.978,
    "hfgKJkg": 121.0
  },
  {
    "tempC": 52,
    "pressureKPa": 1365.563,
    "rhoL": 981.1,
    "rhoV": 80.13,
    "hfgKJkg": 119.9
  },
  {
    "tempC": 53,
    "pressureKPa": 1398.032,
    "rhoL": 976.4,
    "rhoV": 82.343,
    "hfgKJkg": 118.8
  },
  {
    "tempC": 54,
    "pressureKPa": 1431.079,
    "rhoL": 971.6,
    "rhoV": 84.619,
    "hfgKJkg": 117.7
  },
  {
    "tempC": 55,
    "pressureKPa": 1464.709,
    "rhoL": 966.7,
    "rhoV": 86.961,
    "hfgKJkg": 116.5
  },
  {
    "tempC": 56,
    "pressureKPa": 1498.931,
    "rhoL": 961.8,
    "rhoV": 89.371,
    "hfgKJkg": 115.3
  },
  {
    "tempC": 57,
    "pressureKPa": 1533.751,
    "rhoL": 956.8,
    "rhoV": 91.852,
    "hfgKJkg": 114.1
  },
  {
    "tempC": 58,
    "pressureKPa": 1569.178,
    "rhoL": 951.7,
    "rhoV": 94.407,
    "hfgKJkg": 112.9
  },
  {
    "tempC": 59,
    "pressureKPa": 1605.219,
    "rhoL": 946.6,
    "rhoV": 97.04,
    "hfgKJkg": 111.7
  },
  {
    "tempC": 60,
    "pressureKPa": 1641.882,
    "rhoL": 941.3,
    "rhoV": 99.754,
    "hfgKJkg": 110.4
  },
  {
    "tempC": 61,
    "pressureKPa": 1679.174,
    "rhoL": 936.0,
    "rhoV": 102.552,
    "hfgKJkg": 109.1
  },
  {
    "tempC": 62,
    "pressureKPa": 1717.104,
    "rhoL": 930.6,
    "rhoV": 105.438,
    "hfgKJkg": 107.8
  },
  {
    "tempC": 63,
    "pressureKPa": 1755.68,
    "rhoL": 925.1,
    "rhoV": 108.418,
    "hfgKJkg": 106.5
  },
  {
    "tempC": 64,
    "pressureKPa": 1794.911,
    "rhoL": 919.5,
    "rhoV": 111.496,
    "hfgKJkg": 105.1
  },
  {
    "tempC": 65,
    "pressureKPa": 1834.805,
    "rhoL": 913.7,
    "rhoV": 114.676,
    "hfgKJkg": 103.7
  },
  {
    "tempC": 66,
    "pressureKPa": 1875.37,
    "rhoL": 907.9,
    "rhoV": 117.964,
    "hfgKJkg": 102.3
  },
  {
    "tempC": 67,
    "pressureKPa": 1916.617,
    "rhoL": 901.9,
    "rhoV": 121.367,
    "hfgKJkg": 100.9
  },
  {
    "tempC": 68,
    "pressureKPa": 1958.553,
    "rhoL": 895.8,
    "rhoV": 124.891,
    "hfgKJkg": 99.4
  },
  {
    "tempC": 69,
    "pressureKPa": 2001.189,
    "rhoL": 889.6,
    "rhoV": 128.544,
    "hfgKJkg": 97.9
  },
  {
    "tempC": 70,
    "pressureKPa": 2044.535,
    "rhoL": 883.2,
    "rhoV": 132.332,
    "hfgKJkg": 96.3
  },
  {
    "tempC": 71,
    "pressureKPa": 2088.6,
    "rhoL": 876.7,
    "rhoV": 136.266,
    "hfgKJkg": 94.8
  },
  {
    "tempC": 72,
    "pressureKPa": 2133.395,
    "rhoL": 870.0,
    "rhoV": 140.355,
    "hfgKJkg": 93.1
  },
  {
    "tempC": 73,
    "pressureKPa": 2178.931,
    "rhoL": 863.1,
    "rhoV": 144.611,
    "hfgKJkg": 91.5
  },
  {
    "tempC": 74,
    "pressureKPa": 2225.219,
    "rhoL": 856.1,
    "rhoV": 149.044,
    "hfgKJkg": 89.8
  },
  {
    "tempC": 75,
    "pressureKPa": 2272.271,
    "rhoL": 848.8,
    "rhoV": 153.671,
    "hfgKJkg": 88.0
  },
  {
    "tempC": 76,
    "pressureKPa": 2320.1,
    "rhoL": 841.4,
    "rhoV": 158.505,
    "hfgKJkg": 86.2
  },
  {
    "tempC": 77,
    "pressureKPa": 2368.717,
    "rhoL": 833.7,
    "rhoV": 163.566,
    "hfgKJkg": 84.3
  },
  {
    "tempC": 78,
    "pressureKPa": 2418.137,
    "rhoL": 825.7,
    "rhoV": 168.874,
    "hfgKJkg": 82.4
  },
  {
    "tempC": 79,
    "pressureKPa": 2468.375,
    "rhoL": 817.5,
    "rhoV": 174.454,
    "hfgKJkg": 80.4
  },
  {
    "tempC": 80,
    "pressureKPa": 2519.445,
    "rhoL": 809.0,
    "rhoV": 180.333,
    "hfgKJkg": 78.4
  }
];

    // Editable viscosity anchor estimates. These are NOT datasheet values.
    const DEFAULT_VISCOSITY_ANCHORS = [
  {
    "tempC": -50,
    "muL_Pa_s": 0.00021,
    "muV_Pa_s": 1.1e-05
  },
  {
    "tempC": -40,
    "muL_Pa_s": 0.00019,
    "muV_Pa_s": 1.15e-05
  },
  {
    "tempC": -30,
    "muL_Pa_s": 0.00017,
    "muV_Pa_s": 1.2e-05
  },
  {
    "tempC": -20,
    "muL_Pa_s": 0.000155,
    "muV_Pa_s": 1.25e-05
  },
  {
    "tempC": -10,
    "muL_Pa_s": 0.00014,
    "muV_Pa_s": 1.3e-05
  },
  {
    "tempC": 0,
    "muL_Pa_s": 0.000128,
    "muV_Pa_s": 1.35e-05
  },
  {
    "tempC": 10,
    "muL_Pa_s": 0.000118,
    "muV_Pa_s": 1.4e-05
  },
  {
    "tempC": 20,
    "muL_Pa_s": 0.000108,
    "muV_Pa_s": 1.45e-05
  },
  {
    "tempC": 30,
    "muL_Pa_s": 9.9e-05,
    "muV_Pa_s": 1.5e-05
  },
  {
    "tempC": 40,
    "muL_Pa_s": 9.1e-05,
    "muV_Pa_s": 1.55e-05
  },
  {
    "tempC": 50,
    "muL_Pa_s": 8.4e-05,
    "muV_Pa_s": 1.6e-05
  },
  {
    "tempC": 60,
    "muL_Pa_s": 7.7e-05,
    "muV_Pa_s": 1.65e-05
  },
  {
    "tempC": 70,
    "muL_Pa_s": 7e-05,
    "muV_Pa_s": 1.7e-05
  },
  {
    "tempC": 80,
    "muL_Pa_s": 6.3e-05,
    "muV_Pa_s": 1.75e-05
  }
];

    // Editable lookup table for geometry auto-fill.
    const DEFAULT_PIPE_TABLE = [
  {
    "standard": "Schedule 10 pipe",
    "sizeIn": 0.25,
    "idMm": 9.22
  },
  {
    "standard": "Schedule 10 pipe",
    "sizeIn": 0.375,
    "idMm": 12.48
  },
  {
    "standard": "Schedule 10 pipe",
    "sizeIn": 0.5,
    "idMm": 15.76
  },
  {
    "standard": "Schedule 10 pipe",
    "sizeIn": 0.625,
    "idMm": 18.9
  },
  {
    "standard": "Schedule 10 pipe",
    "sizeIn": 0.75,
    "idMm": 20.96
  },
  {
    "standard": "Schedule 10 pipe",
    "sizeIn": 0.875,
    "idMm": 23.62
  },
  {
    "standard": "Schedule 10 pipe",
    "sizeIn": 1.0,
    "idMm": 26.64
  },
  {
    "standard": "Schedule 10 pipe",
    "sizeIn": 1.125,
    "idMm": 29.54
  },
  {
    "standard": "Schedule 10 pipe",
    "sizeIn": 1.25,
    "idMm": 35.05
  },
  {
    "standard": "Schedule 10 pipe",
    "sizeIn": 1.5,
    "idMm": 40.89
  },
  {
    "standard": "Schedule 10 pipe",
    "sizeIn": 2.0,
    "idMm": 52.5
  },
  {
    "standard": "Schedule 40 pipe",
    "sizeIn": 0.25,
    "idMm": 9.27
  },
  {
    "standard": "Schedule 40 pipe",
    "sizeIn": 0.375,
    "idMm": 12.49
  },
  {
    "standard": "Schedule 40 pipe",
    "sizeIn": 0.5,
    "idMm": 15.8
  },
  {
    "standard": "Schedule 40 pipe",
    "sizeIn": 0.625,
    "idMm": 17.91
  },
  {
    "standard": "Schedule 40 pipe",
    "sizeIn": 0.75,
    "idMm": 20.93
  },
  {
    "standard": "Schedule 40 pipe",
    "sizeIn": 0.875,
    "idMm": 23.62
  },
  {
    "standard": "Schedule 40 pipe",
    "sizeIn": 1.0,
    "idMm": 26.64
  },
  {
    "standard": "Schedule 40 pipe",
    "sizeIn": 1.125,
    "idMm": 29.54
  },
  {
    "standard": "Schedule 40 pipe",
    "sizeIn": 1.25,
    "idMm": 35.05
  },
  {
    "standard": "Schedule 40 pipe",
    "sizeIn": 1.5,
    "idMm": 40.89
  },
  {
    "standard": "Schedule 40 pipe",
    "sizeIn": 2.0,
    "idMm": 52.5
  },
  {
    "standard": "ACR copper tube",
    "sizeIn": 0.25,
    "idMm": 4.83
  },
  {
    "standard": "ACR copper tube",
    "sizeIn": 0.375,
    "idMm": 7.72
  },
  {
    "standard": "ACR copper tube",
    "sizeIn": 0.5,
    "idMm": 10.8
  },
  {
    "standard": "ACR copper tube",
    "sizeIn": 0.625,
    "idMm": 13.84
  },
  {
    "standard": "ACR copper tube",
    "sizeIn": 0.75,
    "idMm": 16.89
  },
  {
    "standard": "ACR copper tube",
    "sizeIn": 0.875,
    "idMm": 19.94
  },
  {
    "standard": "ACR copper tube",
    "sizeIn": 1.0,
    "idMm": 22.99
  },
  {
    "standard": "ACR copper tube",
    "sizeIn": 1.125,
    "idMm": 26.04
  },
  {
    "standard": "ACR copper tube",
    "sizeIn": 1.25,
    "idMm": 29.08
  },
  {
    "standard": "ACR copper tube",
    "sizeIn": 1.5,
    "idMm": 35.18
  },
  {
    "standard": "ACR copper tube",
    "sizeIn": 2.0,
    "idMm": 47.88
  },
  {
    "standard": "Sanitary tube",
    "sizeIn": 0.25,
    "idMm": 3.56
  },
  {
    "standard": "Sanitary tube",
    "sizeIn": 0.375,
    "idMm": 6.73
  },
  {
    "standard": "Sanitary tube",
    "sizeIn": 0.5,
    "idMm": 9.4
  },
  {
    "standard": "Sanitary tube",
    "sizeIn": 0.625,
    "idMm": 12.57
  },
  {
    "standard": "Sanitary tube",
    "sizeIn": 0.75,
    "idMm": 15.75
  },
  {
    "standard": "Sanitary tube",
    "sizeIn": 0.875,
    "idMm": 18.92
  },
  {
    "standard": "Sanitary tube",
    "sizeIn": 1.0,
    "idMm": 22.1
  },
  {
    "standard": "Sanitary tube",
    "sizeIn": 1.125,
    "idMm": 25.27
  },
  {
    "standard": "Sanitary tube",
    "sizeIn": 1.25,
    "idMm": 28.45
  },
  {
    "standard": "Sanitary tube",
    "sizeIn": 1.5,
    "idMm": 34.8
  },
  {
    "standard": "Sanitary tube",
    "sizeIn": 2.0,
    "idMm": 47.5
  }
];

    // App state.
    let satMode = 'temp';
    let sizeMode = 'lookup';
    let refrigerantTable = seedRefrigerantTable(DEFAULT_SATURATION_ROWS);
    let pipeTable = clone(DEFAULT_PIPE_TABLE);

    // ============================================================
    // Small utility helpers
    // ============================================================

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function toNumber(value, fallback = NaN) {
      if (value === null || value === undefined) return fallback;
      if (typeof value === 'string' && value.trim() === '') return fallback;
      const x = Number(value);
      return Number.isFinite(x) ? x : fallback;
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function fmt(value, digits = 3) {
      if (!Number.isFinite(value)) return '—';
      const abs = Math.abs(value);
      if (abs !== 0 && (abs < 1e-4 || abs >= 1e7)) {
        return value.toExponential(Math.min(digits, 3));
      }
      return value.toLocaleString(undefined, { maximumFractionDigits: digits });
    }

    function uniqueInOrder(values) {
      const seen = new Set();
      const out = [];
      values.forEach((value) => {
        if (!seen.has(value)) {
          seen.add(value);
          out.push(value);
        }
      });
      return out;
    }

    function sortByKey(table, key) {
      return [...table].sort((a, b) => toNumber(a[key], 0) - toNumber(b[key], 0));
    }

    function lerp(x, x1, y1, x2, y2) {
      if (x2 === x1) return y1;
      return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
    }

    function escapeHtml(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // ============================================================
    // Seed editable viscosity estimates into the saturation table.
    // ============================================================

    function interpolateFromAnchors(tempC, key) {
      const sorted = sortByKey(DEFAULT_VISCOSITY_ANCHORS, 'tempC');
      if (tempC <= sorted[0].tempC) return sorted[0][key];
      if (tempC >= sorted[sorted.length - 1].tempC) return sorted[sorted.length - 1][key];

      for (let i = 0; i < sorted.length - 1; i += 1) {
        const a = sorted[i];
        const b = sorted[i + 1];
        if (tempC >= a.tempC && tempC <= b.tempC) {
          return lerp(tempC, a.tempC, a[key], b.tempC, b[key]);
        }
      }
      return sorted[0][key];
    }

    function seedRefrigerantTable(saturationRows) {
      return sortByKey(saturationRows, 'tempC').map((row) => ({
        tempC: row.tempC,
        pressureKPa: row.pressureKPa,
        rhoL: row.rhoL,
        rhoV: row.rhoV,
        hfgKJkg: row.hfgKJkg,
        muL_Pa_s: interpolateFromAnchors(row.tempC, 'muL_Pa_s'),
        muV_Pa_s: interpolateFromAnchors(row.tempC, 'muV_Pa_s')
      }));
    }

    // ============================================================
    // Row interpolation helpers for pressure-mode lookup
    // ============================================================

    function interpolateRow(table, xKey, xValue) {
      const sorted = sortByKey(table, xKey);
      if (!sorted.length) {
        return { row: null, clamped: 'empty', lower: null, upper: null };
      }

      if (xValue <= sorted[0][xKey]) {
        return { row: { ...sorted[0] }, clamped: 'low', lower: sorted[0], upper: null };
      }

      if (xValue >= sorted[sorted.length - 1][xKey]) {
        return { row: { ...sorted[sorted.length - 1] }, clamped: 'high', lower: null, upper: sorted[sorted.length - 1] };
      }

      for (let i = 0; i < sorted.length - 1; i += 1) {
        const a = sorted[i];
        const b = sorted[i + 1];
        if (xValue >= a[xKey] && xValue <= b[xKey]) {
          const row = {};
          Object.keys(a).forEach((key) => {
            if (typeof a[key] === 'number' && typeof b[key] === 'number') {
              row[key] = lerp(xValue, a[xKey], a[key], b[xKey], b[key]);
            } else {
              row[key] = a[key];
            }
          });
          return { row, clamped: null, lower: a, upper: b };
        }
      }

      return { row: { ...sorted[0] }, clamped: 'unknown', lower: null, upper: null };
    }

    function findNearestRowByTemp(table, tempC) {
      const sorted = sortByKey(table, 'tempC');
      if (!sorted.length) return null;
      let best = sorted[0];
      let bestDiff = Math.abs(sorted[0].tempC - tempC);
      sorted.forEach((row) => {
        const diff = Math.abs(row.tempC - tempC);
        if (diff < bestDiff) {
          best = row;
          bestDiff = diff;
        }
      });
      return { ...best };
    }

    function darcyFrictionFactor(reynolds) {
      if (!Number.isFinite(reynolds) || reynolds <= 0) return NaN;
      if (reynolds < 2300) return 64.0 / reynolds;
      return 0.3164 / Math.pow(reynolds, 0.25);
    }

    // ============================================================
    // Unit conversions
    // ============================================================

    function tempFromC(value, unit) {
      return unit === 'F' ? (value * 9.0 / 5.0) + 32.0 : value;
    }

    function tempUnitLabel(unit) {
      return unit === 'F' ? '°F' : '°C';
    }

    function loadToW(value, unit) {
      if (unit === 'W') return value;
      if (unit === 'kW') return value * 1000.0;
      if (unit === 'Btu/h') return value * BTUH_TO_W;
      if (unit === 'tonR') return value * TONR_TO_W;
      return value;
    }

    function loadFromW(value, unit) {
      if (unit === 'W') return value;
      if (unit === 'kW') return value / 1000.0;
      if (unit === 'Btu/h') return value / BTUH_TO_W;
      if (unit === 'tonR') return value / TONR_TO_W;
      return value;
    }

    function loadUnitLabel(unit) {
      if (unit === 'tonR') return 'tonR';
      return unit;
    }

    function massFlowToKgS(value, unit) {
      if (unit === 'kg/s') return value;
      if (unit === 'kg/min') return value / 60.0;
      if (unit === 'lb/s') return value * LB_TO_KG;
      if (unit === 'lb/min') return (value * LB_TO_KG) / 60.0;
      return value;
    }

    function massFlowFromKgS(value, unit) {
      if (unit === 'kg/s') return value;
      if (unit === 'kg/min') return value * 60.0;
      if (unit === 'lb/s') return value * KG_TO_LB;
      if (unit === 'lb/min') return value * KG_TO_LB * 60.0;
      return value;
    }

    function massFlowUnitLabel(unit) {
      return unit;
    }

    function lengthToM(value, unit) {
      if (unit === 'm') return value;
      if (unit === 'mm') return value * MM_TO_M;
      if (unit === 'in') return value * IN_TO_M;
      if (unit === 'ft') return value * FT_TO_M;
      return value;
    }

    function lengthFromM(value, unit) {
      if (unit === 'm') return value;
      if (unit === 'mm') return value / MM_TO_M;
      if (unit === 'in') return value / IN_TO_M;
      if (unit === 'ft') return value / FT_TO_M;
      return value;
    }

    function metersPerLengthUnit(unit) {
      if (unit === 'm') return 1.0;
      if (unit === 'mm') return MM_TO_M;
      if (unit === 'in') return IN_TO_M;
      if (unit === 'ft') return FT_TO_M;
      return 1.0;
    }

    function lengthUnitLabel(unit) {
      if (unit === 'mm') return 'mm';
      if (unit === 'in') return 'in';
      if (unit === 'ft') return 'ft';
      return 'm';
    }

    function areaFromM2(value, unit) {
      if (unit === 'm2') return value;
      if (unit === 'ft2') return value * M2_TO_FT2;
      if (unit === 'in2') return value * M2_TO_IN2;
      return value;
    }

    function areaUnitLabel(unit) {
      if (unit === 'ft2') return 'ft²';
      if (unit === 'in2') return 'in²';
      return 'm²';
    }

    // ------------------------------------------------------------
    // Absolute pressure vs gauge pressure vs differential pressure
    // ------------------------------------------------------------
    // - Saturation pressure is a STATE property.
    // - psig = psia - atmospheric pressure.
    // - Pressure DROP is DIFFERENTIAL pressure. A 5 psi drop is simply
    //   5 psi (or 5 psid). Do NOT subtract atmospheric pressure from a
    //   pressure loss value.

    function statePressureToPa(value, unit) {
      if (unit === 'Pa') return value;
      if (unit === 'kPa') return value * KPA_TO_PA;
      if (unit === 'psia') return value * PSI_TO_PA;
      if (unit === 'psig') return (value * PSI_TO_PA) + ATM_PRESSURE_PA;
      return value;
    }

    function statePressureFromPa(valuePa, unit) {
      if (unit === 'Pa') return valuePa;
      if (unit === 'kPa') return valuePa / KPA_TO_PA;
      if (unit === 'psia') return valuePa / PSI_TO_PA;
      if (unit === 'psig') return (valuePa - ATM_PRESSURE_PA) / PSI_TO_PA;
      return valuePa;
    }

    function pressureDropFromPa(valuePa, unit) {
      const positiveValue = Math.abs(valuePa);
      if (unit === 'Pa') return positiveValue;
      if (unit === 'kPa') return positiveValue / KPA_TO_PA;
      if (unit === 'psia' || unit === 'psig') return positiveValue / PSI_TO_PA;
      return positiveValue;
    }

    function absolutePressureUnitLabel(unit) {
      if (unit === 'Pa') return 'Pa(a)';
      if (unit === 'kPa') return 'kPa(a)';
      if (unit === 'psia') return 'psia';
      if (unit === 'psig') return 'psig';
      return unit;
    }

    function differentialPressureUnitLabel(unit) {
      if (unit === 'Pa') return 'Pa';
      if (unit === 'kPa') return 'kPa';
      if (unit === 'psig') return 'psid';
      if (unit === 'psia') return 'psi';
      return unit;
    }

    function velocityFromMps(value, unit) {
      return unit === 'ft/s' ? value * MPS_TO_FPS : value;
    }

    function velocityUnitLabel(unit) {
      return unit === 'ft/s' ? 'ft/s' : 'm/s';
    }

    function densityFromKgM3(value, unit) {
      return unit === 'lb/ft3' ? value * KG_M3_TO_LB_FT3 : value;
    }

    function densityUnitLabel(unit) {
      return unit === 'lb/ft3' ? 'lb/ft³' : 'kg/m³';
    }

    function massFluxFromSI(value, unit) {
      if (unit === 'kg/m2-s') return value;
      if (unit === 'kg/m2-min') return value * 60.0;
      if (unit === 'lb/ft2-s') return value * (KG_TO_LB / M2_TO_FT2);
      if (unit === 'lb/ft2-min') return value * (KG_TO_LB / M2_TO_FT2) * 60.0;
      return value;
    }

    function massFluxUnitLabel(unit) {
      if (unit === 'kg/m2-min') return 'kg/m²·min';
      if (unit === 'lb/ft2-s') return 'lb/ft²·s';
      if (unit === 'lb/ft2-min') return 'lb/ft²·min';
      return 'kg/m²·s';
    }

    function viscosityFromPaS(value, unit) {
      return unit === 'cP' ? value * PA_S_TO_CP : value;
    }

    function viscosityUnitLabel(unit) {
      return unit === 'cP' ? 'cP' : 'Pa·s';
    }

    // ============================================================
    // Rendering helpers
    // ============================================================

    function refreshTemperatureSelect() {
      const select = document.getElementById('satTempRow');
      const unit = document.getElementById('satTempDisplayUnit').value;
      const currentValue = toNumber(select.value, 5);
      const temps = uniqueInOrder(sortByKey(refrigerantTable, 'tempC').map((row) => Math.round(toNumber(row.tempC, 0))));

      select.innerHTML = temps.map((tempC) => {
        const label = unit === 'F'
          ? `${fmt(tempFromC(tempC, 'F'), 1)} °F (${fmt(tempC, 0)} °C row)`
          : `${fmt(tempC, 0)} °C`;
        return `<option value="${tempC}">${label}</option>`;
      }).join('');

      const fallback = temps.includes(5) ? 5 : (temps.length ? temps[0] : 0);
      select.value = temps.includes(currentValue) ? String(currentValue) : String(fallback);
    }

    function refreshPipeSelectors() {
      const standardSelect = document.getElementById('selectedStandard');
      const sizeSelect = document.getElementById('selectedSizeIn');
      const currentStandard = standardSelect.value || 'ACR copper tube';
      const currentSize = toNumber(sizeSelect.value, 0.75);

      const standards = uniqueInOrder(pipeTable.map((row) => row.standard).filter(Boolean));
      standardSelect.innerHTML = standards.map((standard) => `<option value="${escapeHtml(standard)}">${escapeHtml(standard)}</option>`).join('');
      standardSelect.value = standards.includes(currentStandard) ? currentStandard : (standards[0] || '');

      const sizeOptions = sortByKey(
        pipeTable.filter((row) => row.standard === standardSelect.value),
        'sizeIn'
      ).map((row) => toNumber(row.sizeIn, 0));

      const uniqueSizes = uniqueInOrder(sizeOptions);
      sizeSelect.innerHTML = uniqueSizes.map((sizeIn) => `<option value="${sizeIn}">${sizeIn}</option>`).join('');
      const fallbackSize = uniqueSizes.includes(0.75) ? 0.75 : (uniqueSizes[0] || 0);
      sizeSelect.value = uniqueSizes.includes(currentSize) ? String(currentSize) : String(fallbackSize);
    }

    function renderPipeTable() {
      const table = document.getElementById('pipeTable');
      table.innerHTML = `
        <thead>
          <tr>
            <th>Standard</th>
            <th>Size (in)</th>
            <th>ID (mm)</th>
          </tr>
        </thead>
        <tbody>
          ${pipeTable.map((row, i) => `
            <tr>
              <td><input type="text" value="${escapeHtml(row.standard)}" onchange="updatePipeCell(this, ${i}, 'standard')"></td>
              <td><input type="number" step="any" value="${row.sizeIn}" onchange="updatePipeCell(this, ${i}, 'sizeIn')"></td>
              <td><input type="number" step="any" value="${row.idMm}" onchange="updatePipeCell(this, ${i}, 'idMm')"></td>
            </tr>
          `).join('')}
        </tbody>
      `;
    }

    function renderRefrigerantTable() {
      const cols = ['tempC', 'pressureKPa', 'rhoL', 'rhoV', 'hfgKJkg', 'muL_Pa_s', 'muV_Pa_s'];
      const labels = {
        tempC: 'Temp (°C row)',
        pressureKPa: 'Sat pressure (kPa abs)',
        rhoL: 'Liquid density, ρl (kg/m³)',
        rhoV: 'Vapor density, ρv (kg/m³)',
        hfgKJkg: 'Latent heat, hfg (kJ/kg)',
        muL_Pa_s: 'Liquid μ estimate (Pa·s)',
        muV_Pa_s: 'Vapor μ estimate (Pa·s)'
      };

      const table = document.getElementById('refTable');
      table.innerHTML = `
        <thead>
          <tr>${cols.map((col) => `<th>${labels[col]}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${refrigerantTable.map((row, i) => `
            <tr>
              ${cols.map((col) => `
                <td>
                  <input
                    type="number"
                    step="any"
                    value="${row[col]}"
                    onchange="updateRefrigerantCell(this, ${i}, '${col}')"
                  >
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      `;
    }

    // ============================================================
    // Editable-table cell handlers
    // ============================================================

    function updatePipeCell(inputEl, rowIndex, key) {
      const row = pipeTable[rowIndex];
      if (!row) return;

      if (key === 'standard') {
        row.standard = String(inputEl.value || '').trim();
      } else if (key === 'sizeIn') {
        row.sizeIn = toNumber(inputEl.value, row.sizeIn);
        inputEl.value = row.sizeIn;
      } else if (key === 'idMm') {
        row.idMm = toNumber(inputEl.value, row.idMm);
        inputEl.value = row.idMm;
      }

      refreshPipeSelectors();
      calculate();
    }

    function updateRefrigerantCell(inputEl, rowIndex, key) {
      const row = refrigerantTable[rowIndex];
      if (!row) return;

      if (key === 'tempC') {
        row.tempC = Math.round(toNumber(inputEl.value, row.tempC));
        inputEl.value = row.tempC;
      } else {
        row[key] = toNumber(inputEl.value, row[key]);
        inputEl.value = row[key];
      }

      refreshTemperatureSelect();
      calculate();
    }

    // ============================================================
    // Mode buttons and lookup helpers
    // ============================================================

    function setSatMode(mode) {
      satMode = mode;
      document.getElementById('satTempBlock').style.display = mode === 'temp' ? '' : 'none';
      document.getElementById('satPressureBlock').style.display = mode === 'pressure' ? '' : 'none';
      document.getElementById('modeTempBtn').classList.toggle('active', mode === 'temp');
      document.getElementById('modePressureBtn').classList.toggle('active', mode === 'pressure');
      calculate();
    }

    function setSizeMode(mode) {
      sizeMode = mode;
      document.getElementById('lookupControls').style.display = mode === 'lookup' ? '' : 'none';
      document.getElementById('lookupModeBtn').classList.toggle('active', mode === 'lookup');
      document.getElementById('manualModeBtn').classList.toggle('active', mode === 'manual');
      calculate();
    }

    function getLookupIdMm() {
      const standard = document.getElementById('selectedStandard').value;
      const sizeIn = toNumber(document.getElementById('selectedSizeIn').value, NaN);
      const row = pipeTable.find((entry) => entry.standard === standard && toNumber(entry.sizeIn, NaN) === sizeIn);
      return row ? toNumber(row.idMm, NaN) : NaN;
    }

    function autoFillLookupId() {
      const idMm = getLookupIdMm();
      if (Number.isFinite(idMm)) {
        document.getElementById('idInput').value = String(idMm);
        document.getElementById('idInputUnit').value = 'mm';
        calculate();
      }
    }

    // ============================================================
    // Clean data access / saturation lookup
    // ============================================================

    function getCleanRefrigerantTable() {
      return refrigerantTable.map((row) => ({
        tempC: Math.round(toNumber(row.tempC, 0)),
        pressureKPa: toNumber(row.pressureKPa, 0),
        rhoL: toNumber(row.rhoL, 0),
        rhoV: toNumber(row.rhoV, 0),
        hfgKJkg: toNumber(row.hfgKJkg, 0),
        muL_Pa_s: toNumber(row.muL_Pa_s, 0),
        muV_Pa_s: toNumber(row.muV_Pa_s, 0)
      }));
    }

    function getSaturationState() {
      const table = getCleanRefrigerantTable();

      if (satMode === 'temp') {
        const selectedTempC = toNumber(document.getElementById('satTempRow').value, 0);
        const row = findNearestRowByTemp(table, selectedTempC);
        return {
          ...row,
          lookupMethod: 'Whole-degree temperature row',
          rowTempCUsed: row ? row.tempC : NaN,
          clamped: null,
          lowerRow: null,
          upperRow: null
        };
      }

      const pressureValue = toNumber(document.getElementById('satPressure').value, NaN);
      const pressureUnit = document.getElementById('satPressureUnit').value;
      const pressurePa = statePressureToPa(pressureValue, pressureUnit);
      const pressureKPa = pressurePa / KPA_TO_PA;
      const result = interpolateRow(table, 'pressureKPa', pressureKPa);
      const row = result.row || {};
      return {
        ...row,
        lookupMethod: 'Pressure interpolation',
        rowTempCUsed: NaN,
        clamped: result.clamped,
        lowerRow: result.lower,
        upperRow: result.upper
      };
    }

    // Keep the inactive saturation input roughly synchronized so switching
    // modes feels natural.
    function syncInactiveStateInput(sat) {
      if (!sat || !Number.isFinite(sat.pressureKPa) || !Number.isFinite(sat.tempC)) return;

      if (satMode === 'temp') {
        const pressureUnit = document.getElementById('satPressureUnit').value;
        const pressureDisplay = statePressureFromPa(sat.pressureKPa * KPA_TO_PA, pressureUnit);
        if (Number.isFinite(pressureDisplay)) {
          document.getElementById('satPressure').value = String(Number(pressureDisplay.toFixed(6)));
        }
      } else {
        const nearestRow = findNearestRowByTemp(getCleanRefrigerantTable(), sat.tempC);
        if (nearestRow && Number.isFinite(nearestRow.tempC)) {
          document.getElementById('satTempRow').value = String(nearestRow.tempC);
        }
      }
    }

    // ============================================================
    // Main calculation
    // ============================================================

    function calculate() {
      const warnings = [];
      const errors = [];

      const sat = getSaturationState();
      syncInactiveStateInput(sat);

      if (satMode === 'pressure' && sat.clamped === 'low') {
        warnings.push('Pressure input is below the minimum pressure in the editable saturation table, so the lowest table row was used.');
      }
      if (satMode === 'pressure' && sat.clamped === 'high') {
        warnings.push('Pressure input is above the maximum pressure in the editable saturation table, so the highest table row was used.');
      }

      const rawXIn = toNumber(document.getElementById('xIn').value, 0);
      const rawXOut = toNumber(document.getElementById('xOut').value, 0);
      const xIn = clamp(rawXIn, 0, 1);
      const xOut = clamp(rawXOut, 0, 1);
      const xAvg = 0.5 * (xIn + xOut);
      const deltaXMag = Math.abs(xOut - xIn);

      if (rawXIn !== xIn) warnings.push('Inlet quality was clamped to the 0 to 1 range.');
      if (rawXOut !== xOut) warnings.push('Outlet quality was clamped to the 0 to 1 range.');

      const rhoL = toNumber(sat.rhoL, NaN);
      const rhoV = toNumber(sat.rhoV, NaN);
      const hfgKJkg = toNumber(sat.hfgKJkg, NaN);
      const muL = toNumber(sat.muL_Pa_s, NaN);
      const muV = toNumber(sat.muV_Pa_s, NaN);

      // Homogeneous mixture density requested by the user.
      const rhoMix = (Number.isFinite(rhoL) && Number.isFinite(rhoV) && rhoL > 0 && rhoV > 0)
        ? 1.0 / ((xAvg / rhoV) + ((1.0 - xAvg) / rhoL))
        : NaN;

      // Version-1 mixture viscosity estimate.
      // The same harmonic-style form is used as a simple way to blend a
      // much larger liquid viscosity with a much smaller vapor viscosity.
      // It is intentionally easy to understand and easy to replace later.
      const muMix = (Number.isFinite(muL) && Number.isFinite(muV) && muL > 0 && muV > 0)
        ? 1.0 / ((xAvg / muV) + ((1.0 - xAvg) / muL))
        : NaN;

      const rawIdInput = toNumber(document.getElementById('idInput').value, NaN);
      if (Number.isFinite(rawIdInput) && rawIdInput < 0) {
        warnings.push('Internal diameter sign was ignored; magnitude was used.');
      }
      const idInput = Math.abs(rawIdInput);
      const idUnit = document.getElementById('idInputUnit').value;
      const idM = lengthToM(idInput, idUnit);
      if (!(Number.isFinite(idM) && idM > 0)) {
        errors.push('Enter a positive internal diameter.');
      }

      const pipeLengthInput = toNumber(document.getElementById('pipeLength').value, NaN);
      const pipeLengthM = lengthToM(pipeLengthInput, document.getElementById('pipeLengthUnit').value);
      if (!(Number.isFinite(pipeLengthM) && pipeLengthM >= 0)) {
        errors.push('Enter a non-negative pipe length.');
      }

      const areaM2 = (Number.isFinite(idM) && idM > 0) ? Math.PI * idM * idM / 4.0 : NaN;

      const directMassFlowRaw = toNumber(document.getElementById('massFlow').value, NaN);
      if (Number.isFinite(directMassFlowRaw) && directMassFlowRaw < 0) {
        warnings.push('Direct mass flow sign was ignored; pressure-drop estimates use magnitude only.');
      }
      const directMassFlowKgS = Math.abs(massFlowToKgS(directMassFlowRaw, document.getElementById('massFlowUnit').value));

      const loadRaw = toNumber(document.getElementById('loadValue').value, NaN);
      if (Number.isFinite(loadRaw) && loadRaw < 0) {
        warnings.push('Load sign was ignored; pressure-drop estimates use magnitude only.');
      }
      const loadW = Math.abs(loadToW(loadRaw, document.getElementById('loadUnit').value));

      const gpmRaw = toNumber(document.getElementById('gpm').value, NaN);
      if (Number.isFinite(gpmRaw) && gpmRaw < 0) {
        warnings.push('GPM sign was ignored; pressure-drop estimates use magnitude only.');
      }
      const gpmValue = Math.abs(gpmRaw);

      const loadMassFlowKgS = (Number.isFinite(loadW) && Number.isFinite(hfgKJkg) && hfgKJkg > 0 && deltaXMag > 0)
        ? loadW / (hfgKJkg * 1000.0 * deltaXMag)
        : NaN;

      const gpmMassFlowKgS = (Number.isFinite(gpmValue) && Number.isFinite(rhoMix) && rhoMix > 0)
        ? gpmValue * US_GPM_TO_M3S * rhoMix
        : NaN;

      const flowBasis = document.getElementById('flowBasis').value;
      let activeMassFlowKgS = NaN;
      let activeMassFlowBasisText = '—';

      if (flowBasis === 'direct') {
        activeMassFlowKgS = directMassFlowKgS;
        activeMassFlowBasisText = 'Direct mass flow rate input';
      } else if (flowBasis === 'load') {
        activeMassFlowKgS = loadMassFlowKgS;
        activeMassFlowBasisText = 'Load + quality change';
        if (!(deltaXMag > 0)) {
          errors.push('Load basis requires a non-zero quality change between inlet and outlet.');
        }
      } else if (flowBasis === 'gpm') {
        activeMassFlowKgS = gpmMassFlowKgS;
        activeMassFlowBasisText = 'GPM + average density';
      }

      if (!(Number.isFinite(rhoMix) && rhoMix > 0)) {
        errors.push('Mixture density could not be evaluated from the current saturation properties.');
      }
      if (!(Number.isFinite(muMix) && muMix > 0)) {
        errors.push('Mixture viscosity could not be evaluated from the editable viscosity estimates.');
      }
      if (!(Number.isFinite(areaM2) && areaM2 > 0)) {
        errors.push('Cross-sectional area could not be evaluated from the entered ID.');
      }
      if (!(Number.isFinite(activeMassFlowKgS) && activeMassFlowKgS >= 0)) {
        errors.push('The selected mass-flow basis could not produce a valid mass flow.');
      }

      let massFluxSI = NaN;
      let velocityMps = NaN;
      let reynolds = NaN;
      let frictionFactor = NaN;
      let dpPerMPa = NaN;
      let totalDpPa = NaN;
      let flowRegime = '—';
      let volumetricFlowM3S = NaN;
      let equivalentGpm = NaN;
      let equivalentLoadW = NaN;

      if (errors.length === 0) {
        massFluxSI = activeMassFlowKgS / areaM2;
        velocityMps = massFluxSI / rhoMix;
        volumetricFlowM3S = activeMassFlowKgS / rhoMix;
        equivalentGpm = volumetricFlowM3S / US_GPM_TO_M3S;
        equivalentLoadW = activeMassFlowKgS * hfgKJkg * 1000.0 * deltaXMag;

        if (activeMassFlowKgS === 0) {
          reynolds = 0;
          frictionFactor = 0;
          dpPerMPa = 0;
          totalDpPa = 0;
          flowRegime = 'No flow';
        } else {
          reynolds = rhoMix * velocityMps * idM / muMix;
          frictionFactor = darcyFrictionFactor(reynolds);
          dpPerMPa = frictionFactor * rhoMix * velocityMps * velocityMps / (2.0 * idM);
          totalDpPa = dpPerMPa * pipeLengthM;
          flowRegime = reynolds < 2300 ? 'Laminar (64/Re)' : 'Turbulent (Blasius)';
        }
      } else {
        if (Number.isFinite(activeMassFlowKgS) && Number.isFinite(areaM2) && areaM2 > 0) {
          massFluxSI = activeMassFlowKgS / areaM2;
        }
      }

      renderWarnings(errors, warnings);
      renderResults({
        idM,
        areaM2,
        activeMassFlowKgS,
        massFluxSI,
        velocityMps,
        rhoMix,
        reynolds,
        frictionFactor,
        dpPerMPa,
        totalDpPa
      });

      renderChecks({
        sat,
        xIn,
        xOut,
        xAvg,
        deltaXMag,
        rhoL,
        rhoV,
        rhoMix,
        muL,
        muV,
        muMix,
        hfgKJkg,
        idM,
        pipeLengthM,
        directMassFlowKgS,
        loadMassFlowKgS,
        gpmMassFlowKgS,
        activeMassFlowKgS,
        activeMassFlowBasisText,
        equivalentGpm,
        equivalentLoadW,
        flowRegime,
        massFluxSI,
        velocityMps,
        dpPerMPa,
        totalDpPa
      });
    }

    // ============================================================
    // Result / message rendering
    // ============================================================

    function renderWarnings(errors, warnings) {
      const box = document.getElementById('warningBox');

      if (errors.length > 0) {
        box.innerHTML = `
          <div class="note danger">
            <strong>Calculation needs attention.</strong>
            <ul class="tight-list">
              ${errors.map((msg) => `<li>${escapeHtml(msg)}</li>`).join('')}
              ${warnings.map((msg) => `<li>${escapeHtml(msg)}</li>`).join('')}
            </ul>
          </div>
        `;
        return;
      }

      if (warnings.length > 0) {
        box.innerHTML = `
          <div class="note warning">
            <strong>Calculation completed with assumptions / warnings.</strong>
            <ul class="tight-list">
              ${warnings.map((msg) => `<li>${escapeHtml(msg)}</li>`).join('')}
            </ul>
          </div>
        `;
        return;
      }

      box.innerHTML = `
        <div class="note ok">
          <strong>Calculation completed.</strong>
          Results below follow the current homogeneous-model assumptions and the current editable property tables.
        </div>
      `;
    }

    function renderResults(result) {
      const resMassFlowUnit = document.getElementById('resMassFlowUnit').value;
      const resLengthUnit = document.getElementById('resLengthUnit').value;
      const resAreaUnit = document.getElementById('resAreaUnit').value;
      const resPressureUnit = document.getElementById('resPressureUnit').value;
      const resVelocityUnit = document.getElementById('resVelocityUnit').value;
      const resDensityUnit = document.getElementById('resDensityUnit').value;
      const resMassFluxUnit = document.getElementById('resMassFluxUnit').value;

      const idDisplay = lengthFromM(result.idM, resLengthUnit);
      const idSecondary = resLengthUnit === 'mm'
        ? ''
        : `${fmt(lengthFromM(result.idM, 'mm'), 3)} mm`;

      const dpPerChosenLength = Number.isFinite(result.dpPerMPa)
        ? pressureDropFromPa(result.dpPerMPa * metersPerLengthUnit(resLengthUnit), resPressureUnit)
        : NaN;

      const cards = [
        {
          label: 'ID',
          value: `${fmt(idDisplay, resLengthUnit === 'm' ? 6 : 4)} ${lengthUnitLabel(resLengthUnit)}`,
          secondary: idSecondary
        },
        {
          label: 'Area',
          value: `${fmt(areaFromM2(result.areaM2, resAreaUnit), resAreaUnit === 'm2' ? 6 : 4)} ${areaUnitLabel(resAreaUnit)}`,
          secondary: ''
        },
        {
          label: 'Mass flow',
          value: `${fmt(massFlowFromKgS(result.activeMassFlowKgS, resMassFlowUnit), 5)} ${massFlowUnitLabel(resMassFlowUnit)}`,
          secondary: ''
        },
        {
          label: 'Mass flux',
          value: `${fmt(massFluxFromSI(result.massFluxSI, resMassFluxUnit), 5)} ${massFluxUnitLabel(resMassFluxUnit)}`,
          secondary: ''
        },
        {
          label: 'Velocity',
          value: `${fmt(velocityFromMps(result.velocityMps, resVelocityUnit), 5)} ${velocityUnitLabel(resVelocityUnit)}`,
          secondary: ''
        },
        {
          label: 'Average density',
          value: `${fmt(densityFromKgM3(result.rhoMix, resDensityUnit), 5)} ${densityUnitLabel(resDensityUnit)}`,
          secondary: ''
        },
        {
          label: 'Reynolds number',
          value: fmt(result.reynolds, 0),
          secondary: ''
        },
        {
          label: 'Friction factor',
          value: fmt(result.frictionFactor, 6),
          secondary: ''
        },
        {
          label: 'Pressure drop / length',
          value: `${fmt(dpPerChosenLength, 6)} ${differentialPressureUnitLabel(resPressureUnit)}/${lengthUnitLabel(resLengthUnit)}`,
          secondary: Number.isFinite(result.dpPerMPa) ? `${fmt(result.dpPerMPa, 4)} Pa/m` : ''
        },
        {
          label: 'Total pressure drop',
          value: `${fmt(pressureDropFromPa(result.totalDpPa, resPressureUnit), 6)} ${differentialPressureUnitLabel(resPressureUnit)}`,
          secondary: Number.isFinite(result.totalDpPa) ? `${fmt(result.totalDpPa / 1000.0, 4)} kPa total` : ''
        }
      ];

      document.getElementById('resultsGrid').innerHTML = cards.map((card) => `
        <div class="result-card">
          <div class="result-label">${escapeHtml(card.label)}</div>
          <div class="result-value">${escapeHtml(card.value)}</div>
          ${card.secondary ? `<div class="result-secondary">${escapeHtml(card.secondary)}</div>` : ''}
        </div>
      `).join('');
    }

    function kvRow(label, value) {
      return `
        <div class="kv-row">
          <div class="kv-key">${escapeHtml(label)}</div>
          <div class="kv-value">${escapeHtml(value)}</div>
        </div>
      `;
    }

    function renderChecks(data) {
      const resMassFlowUnit = document.getElementById('resMassFlowUnit').value;
      const resLengthUnit = document.getElementById('resLengthUnit').value;
      const resPressureUnit = document.getElementById('resPressureUnit').value;
      const resTempUnit = document.getElementById('resTempUnit').value;
      const resDensityUnit = document.getElementById('resDensityUnit').value;
      const resViscUnit = document.getElementById('resViscUnit').value;

      const lookupText = (satMode === 'pressure' && data.sat.lowerRow && data.sat.upperRow)
        ? `Pressure interpolation between ${fmt(data.sat.lowerRow.tempC, 0)} °C and ${fmt(data.sat.upperRow.tempC, 0)} °C rows`
        : `${data.sat.lookupMethod}${Number.isFinite(data.sat.rowTempCUsed) ? ` (${fmt(data.sat.rowTempCUsed, 0)} °C row)` : ''}`;

      const selectedLoadUnit = document.getElementById('loadUnit').value;
      const selectedMassFlowUnit = document.getElementById('massFlowUnit').value;

      const rows = [
        kvRow('Lookup method', lookupText),
        kvRow('Saturation temperature (state)', `${fmt(tempFromC(data.sat.tempC, resTempUnit), 4)} ${tempUnitLabel(resTempUnit)}`),
        kvRow('Saturation pressure (state)', `${fmt(statePressureFromPa(data.sat.pressureKPa * KPA_TO_PA, resPressureUnit), 5)} ${absolutePressureUnitLabel(resPressureUnit)}`),
        kvRow('Tube sizing mode', sizeMode === 'lookup' ? 'Lookup selected, manual ID still editable' : 'Manual ID only'),
        kvRow('Pipe length', `${fmt(lengthFromM(data.pipeLengthM, resLengthUnit), 5)} ${lengthUnitLabel(resLengthUnit)}`),
        kvRow('Quality range', `x_in = ${fmt(data.xIn, 4)}, x_out = ${fmt(data.xOut, 4)}, x_avg = ${fmt(data.xAvg, 4)}`),
        kvRow('Liquid density, ρl', `${fmt(densityFromKgM3(data.rhoL, resDensityUnit), 5)} ${densityUnitLabel(resDensityUnit)}`),
        kvRow('Vapor density, ρv', `${fmt(densityFromKgM3(data.rhoV, resDensityUnit), 5)} ${densityUnitLabel(resDensityUnit)}`),
        kvRow('Mixture density, ρmix', `${fmt(densityFromKgM3(data.rhoMix, resDensityUnit), 5)} ${densityUnitLabel(resDensityUnit)}`),
        kvRow('Liquid viscosity estimate, μl', `${fmt(viscosityFromPaS(data.muL, resViscUnit), 6)} ${viscosityUnitLabel(resViscUnit)}`),
        kvRow('Vapor viscosity estimate, μv', `${fmt(viscosityFromPaS(data.muV, resViscUnit), 6)} ${viscosityUnitLabel(resViscUnit)}`),
        kvRow('Mixture viscosity estimate, μmix', `${fmt(viscosityFromPaS(data.muMix, resViscUnit), 6)} ${viscosityUnitLabel(resViscUnit)}`),
        kvRow('Latent heat, hfg', `${fmt(data.hfgKJkg, 5)} kJ/kg`),
        kvRow('Flow regime assumption', data.flowRegime),
        kvRow('Active mass-flow basis', data.activeMassFlowBasisText),
        kvRow('Direct mass flow input', `${fmt(massFlowFromKgS(data.directMassFlowKgS, selectedMassFlowUnit), 5)} ${massFlowUnitLabel(selectedMassFlowUnit)}`),
        kvRow('Load-based mass flow', `${fmt(massFlowFromKgS(data.loadMassFlowKgS, resMassFlowUnit), 5)} ${massFlowUnitLabel(resMassFlowUnit)}`),
        kvRow('GPM-based mass flow', `${fmt(massFlowFromKgS(data.gpmMassFlowKgS, resMassFlowUnit), 5)} ${massFlowUnitLabel(resMassFlowUnit)}`),
        kvRow('Equivalent volumetric flow from active mass flow', `${fmt(data.equivalentGpm, 5)} US gpm`),
        kvRow('Equivalent latent load from active mass flow', `${fmt(loadFromW(data.equivalentLoadW, selectedLoadUnit), 5)} ${loadUnitLabel(selectedLoadUnit)} (${fmt(loadFromW(data.equivalentLoadW, 'kW'), 5)} kW)`),
        kvRow('Pressure gradient (internal SI check)', `${fmt(data.dpPerMPa, 5)} Pa/m`),
        kvRow('Total pressure drop (internal SI check)', `${fmt(data.totalDpPa, 5)} Pa`)
      ];

      document.getElementById('checks').innerHTML = rows.join('');
    }

    // ============================================================
    // Event wiring
    // ============================================================

    function wireEvents() {
      const simpleRecalcIds = [
        'satTempRow', 'satPressure', 'satPressureUnit', 'xIn', 'xOut', 'flowBasis',
        'massFlow', 'massFlowUnit', 'loadValue', 'loadUnit', 'gpm',
        'pipeLength', 'pipeLengthUnit', 'selectedStandard', 'selectedSizeIn',
        'idInput', 'idInputUnit',
        'resMassFlowUnit', 'resLengthUnit', 'resAreaUnit', 'resPressureUnit',
        'resVelocityUnit', 'resTempUnit', 'resDensityUnit', 'resMassFluxUnit', 'resViscUnit'
      ];

      simpleRecalcIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', calculate);
        el.addEventListener('change', calculate);
      });

      document.getElementById('satTempDisplayUnit').addEventListener('change', () => {
        refreshTemperatureSelect();
        calculate();
      });

      document.getElementById('selectedStandard').addEventListener('change', () => {
        refreshPipeSelectors();
        calculate();
      });

      document.getElementById('modeTempBtn').addEventListener('click', () => setSatMode('temp'));
      document.getElementById('modePressureBtn').addEventListener('click', () => setSatMode('pressure'));
      document.getElementById('lookupModeBtn').addEventListener('click', () => setSizeMode('lookup'));
      document.getElementById('manualModeBtn').addEventListener('click', () => setSizeMode('manual'));
      document.getElementById('autofillBtn').addEventListener('click', autoFillLookupId);
    }

    // ============================================================
    // Startup
    // ============================================================

    function init() {
      refreshTemperatureSelect();
      refreshPipeSelectors();
      renderPipeTable();
      renderRefrigerantTable();
      wireEvents();
      setSatMode('temp');
      setSizeMode('lookup');
      calculate();
    }

    document.addEventListener('DOMContentLoaded', init);
