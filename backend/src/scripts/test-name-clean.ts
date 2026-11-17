const line = "5 لمرسل تبيان عبدالرحيم العوض محمد";
const pattern = /.*(?:إ?سم\s*المرسل|المرسل|لمرسل|مرسل|المستفيد|المحول)[:\s]+/i;
const cleaned = line.replace(pattern, '').trim();
console.log('Original:', line);
console.log('Cleaned name:', cleaned);
