// Amount in words with crore and lakh, like the parts_bazar voucher "In Words":
// 125050.50 => "One Lakh Twenty Five Thousand Fifty Taka And Fifty Paisa Only"

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

// words of a number below 100
function belowHundred(number: number) {
  if (number < 20) {
    return ONES[number];
  }
  let words = TENS[Math.floor(number / 10)];
  if (number % 10 > 0) {
    words = words + " " + ONES[number % 10];
  }
  return words;
}

// words of a number below 1000
function belowThousand(number: number) {
  let words = "";
  if (number >= 100) {
    words = ONES[Math.floor(number / 100)] + " Hundred";
    number = number % 100;
  }
  if (number > 0) {
    if (words !== "") {
      words = words + " ";
    }
    words = words + belowHundred(number);
  }
  return words;
}

// words of a whole number, with crore, lakh and thousand
function wholeNumber(number: number): string {
  if (number === 0) {
    return "Zero";
  }
  const parts: string[] = [];

  const crore = Math.floor(number / 10000000);
  number = number % 10000000;
  const lakh = Math.floor(number / 100000);
  number = number % 100000;
  const thousand = Math.floor(number / 1000);
  number = number % 1000;

  if (crore > 0) {
    parts.push(wholeNumber(crore) + " Crore");
  }
  if (lakh > 0) {
    parts.push(belowHundred(lakh) + " Lakh");
  }
  if (thousand > 0) {
    parts.push(belowHundred(thousand) + " Thousand");
  }
  if (number > 0) {
    parts.push(belowThousand(number));
  }
  return parts.join(" ");
}

export function amountInWords(value: number | string) {
  const amount = Math.abs(Math.round(Number(value) * 100) / 100);
  if (isNaN(amount)) {
    return "";
  }
  const taka = Math.floor(amount);
  const paisa = Math.round((amount - taka) * 100);

  let words = wholeNumber(taka) + " Taka";
  if (paisa > 0) {
    words = words + " And " + belowHundred(paisa) + " Paisa";
  }
  return words + " Only";
}
