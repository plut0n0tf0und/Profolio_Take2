
export function generatePassword(
  length: number,
  useSymbols: boolean,
  useNumbers: boolean
): string {
  const lowerCaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const upperCaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let charSet = lowerCaseChars + upperCaseChars;

  const numberChars = '0123456789';
  if (useNumbers) {
    charSet += numberChars;
  }

  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (useSymbols) {
    charSet += symbolChars;
  }

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charSet.length);
    password += charSet[randomIndex];
  }

  return password;
}
