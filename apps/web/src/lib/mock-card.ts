export type MockCardData = {
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
};

function randomDigit(): string {
  return `${Math.floor(Math.random() * 10)}`;
}

function luhnCheckDigit(baseNumber: string): string {
  let sum = 0;
  let shouldDouble = true;

  for (let index = baseNumber.length - 1; index >= 0; index -= 1) {
    const digit = Number(baseNumber[index]);
    let normalized = digit;

    if (shouldDouble) {
      normalized *= 2;
      if (normalized > 9) {
        normalized -= 9;
      }
    }

    sum += normalized;
    shouldDouble = !shouldDouble;
  }

  const mod = sum % 10;
  return `${(10 - mod) % 10}`;
}

function generateVisaNumber(): string {
  let base = "4";
  while (base.length < 15) {
    base += randomDigit();
  }

  return `${base}${luhnCheckDigit(base)}`;
}

function formatCardNumber(cardNumber: string): string {
  return cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function toTwoDigits(value: number): string {
  return `${value}`.padStart(2, "0");
}

export function generateMockCardData(cardHolderName: string): MockCardData {
  const now = new Date();
  const plusYears = Math.floor(Math.random() * 4) + 1;
  const month = Math.floor(Math.random() * 12) + 1;
  const year = (now.getUTCFullYear() + plusYears) % 100;

  const cvc = `${Math.floor(100 + Math.random() * 900)}`;
  const holder =
    cardHolderName.trim().length > 0
      ? cardHolderName.trim()
      : "Atlas Test Customer";

  const cardNumber = generateVisaNumber();

  return {
    cardHolder: holder,
    cardNumber: formatCardNumber(cardNumber),
    expiryMonth: toTwoDigits(month),
    expiryYear: toTwoDigits(year),
    cvc,
  };
}
