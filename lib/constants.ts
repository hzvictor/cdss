import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

export const suggestions = [
  "AC-T 方案化疗第 2 周期，发热 39 度，担心粒缺",
  "服用他莫昔芬 3 个月，潮热严重，每晚被汗湿醒",
  "紫杉类化疗后手脚麻木，扣纽扣都困难",
  "乳腺癌术后患侧上肢肿胀加重，按上去发硬",
];
