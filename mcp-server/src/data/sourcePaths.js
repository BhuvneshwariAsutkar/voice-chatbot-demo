import dotenv from 'dotenv';
dotenv.config();
export const CSV_PATHS = [
  `${process.env.PROJECT_PATH}/HelpandSupportPage.csv`,
  // Add more CSV file paths here as needed
];

export const FAQ_URL_PATHS = [
  'https://www.bupa.co.uk/intermediaries/consumer-intermediary-portal/bfhi-faqs?_its=eJwljktqxDAQRO_Saxn0_90gi2xyASN3t4jAkUFWshnGZw-eWVZRj1cP-GsEGWTAiJbLEqoLi_WMS3RuW7ZC2nqpjUIFAs5ZJkOGsc9LBResjMbray-dLr365FJaqQ3GuRq01WnpUqkmSt40GU6Y2JdkFZEHAWXO0bbf2Y4O-QF0_JTWIQMIGFx5DB7vhN-ld94_CPLLIeAc-HnQfeWtg1f1xfUGngLONvmeRx_V8x8tHURZ',
  'https://www.bupa.co.uk/mybupa'
  // Add more FAQ URLs here as needed
];
