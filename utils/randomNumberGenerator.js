import crypto from 'crypto';

export const generateFourDigitNumber = () => {
  return Math.floor(1000 + (Math.random() * 9000));
};

export const generateEightDigitNumber = () => {
  return Math.floor(10000000 + (Math.random() * 90000000));
};

export const generateOTP = () => {
  return crypto.randomInt(100000, 1000000);
};