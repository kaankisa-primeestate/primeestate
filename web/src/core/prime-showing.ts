export function buildShowingConfirmationMessage(input: {
  customerName: string;
  listingTitle: string;
  dateTime: Date;
}) {
  const date = input.dateTime.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = input.dateTime.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `Merhaba ${input.customerName}, ${input.listingTitle} portföyü için gösterimimizi ${date} saat ${time} olarak planladım. Sizin için uygun mudur? Uygunsa "Evet" diye dönüş yapabilirsiniz.`;
}

export function showingNextAction(dateTime: Date) {
  return { label: "Gösterim teyidini al", nextActionAt: dateTime };
}
