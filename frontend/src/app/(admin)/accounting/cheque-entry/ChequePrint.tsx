"use client";
// Cheque print, like parts_bazar chequeEntry/commonview: the date boxes, Pay To, the amount
// in words on two lines and the amount are put on the cheque leaf (195mm x 89mm).
// The empty part of each line is filled with stars so nothing can be written after it.
import { useRef } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { printHtml } from "@/lib/print";
import { formatDate, formatMoney } from "@/lib/format";
import { amountInWords } from "@/lib/inWords";
import { ChequeEntry } from "@/services/chequeBookService";

// the same places as parts_bazar commonview (print part), kept under .cheque-leaf
// so the class names do not touch the rest of the page
const LEAF_STYLE = `
  .cheque-leaf .body-area { position: relative; width: 195mm; height: 89mm; box-sizing: border-box; overflow: hidden; font-family: "Poppins", Arial, sans-serif; }
  .cheque-leaf .date-area { position: absolute; right: 0.35cm; top: 1.26cm; border-collapse: separate; border-spacing: 4.3px; }
  .cheque-leaf .date-area td { width: 5.2mm; text-align: center; vertical-align: middle; font-size: 14px; }
  .cheque-leaf .body-text { margin-top: 2.95cm; }
  .cheque-leaf .text1 { margin: 0; margin-left: 16mm; width: 16cm; font-size: 14px; text-transform: uppercase; }
  .cheque-leaf .text2 { position: relative; margin: 0; margin-top: 15px; margin-left: 32mm; width: 10.2cm; font-size: 14px; text-transform: uppercase; }
  .cheque-leaf .amount { position: absolute; left: 10.8cm; top: 12px; width: 4cm; font-size: 16px; }
  .cheque-leaf .text3 { margin: 0; margin-top: 18px; margin-left: 10mm; width: 12cm; font-size: 14px; text-transform: uppercase; }
  .cheque-leaf .star { font-size: 16px; width: 10px; display: inline-block; }
`;

const PRINT_STYLE = "@page { size: 195mm 89mm; margin: 0; } body { margin: 0; }" + LEAF_STYLE;

// the text and then stars up to the limit (parts_bazar fillupByStar)
function withStars(text: string, limit: number) {
  let stars = "";
  for (let i = text.length; i < limit; i++) {
    stars = stars + "*";
  }
  return { text: text, stars: stars };
}

// the amount in words, split like parts_bazar: words fill the first line up to 39 letters,
// the rest goes to the second line
function wordLines(amount: string) {
  const inWord = amountInWords(amount);
  const words = inWord.split(" ");
  let firstLine = "";
  let secondLine = "";
  let firstLimit = 39;
  for (const word of words) {
    if (word === "") {
      continue;
    }
    if (firstLine.length + word.length <= firstLimit) {
      firstLine = firstLine + word + " ";
    } else {
      firstLimit = 0;
      secondLine = secondLine + word + " ";
    }
  }
  return { inWord: inWord, firstLine: firstLine, secondLine: secondLine, firstLimit: firstLimit };
}

function StarText({ text, limit }: { text: string; limit: number }) {
  const filled = withStars(text, limit);
  const stars = [];
  for (let i = 0; i < filled.stars.length; i++) {
    stars.push(
      <span key={i} className="star">
        *
      </span>
    );
  }
  return (
    <>
      {filled.text}
      {stars}
    </>
  );
}

interface Props {
  entry: ChequeEntry | null;
  onClose: () => void;
}

export function ChequePrint({ entry, onClose }: Props) {
  const printArea = useRef<HTMLDivElement>(null);

  function print() {
    if (printArea.current && entry) {
      printHtml("Cheque " + entry.cheque_no, printArea.current.outerHTML, PRINT_STYLE);
    }
  }

  let dateDigits = ["", "", "", "", "", "", "", ""];
  let lines = { inWord: "", firstLine: "", secondLine: "", firstLimit: 39 };
  if (entry) {
    if (entry.cheque_date) {
      // "2026-11-23" -> 2 3 1 1 2 0 2 6
      const parts = entry.cheque_date.substring(0, 10).split("-");
      dateDigits = (parts[2] + parts[1] + parts[0]).split("");
    }
    lines = wordLines(entry.amount);
  }

  return (
    <Modal
      isOpen={entry !== null}
      onClose={onClose}
      className="max-w-4xl"
      title={entry ? "Cheque " + entry.cheque_no : "Cheque"}
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" onClick={print}>Print Cheque</Button>
        </>
      }
    >
      {entry && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-4">
            <div>Bank: <span className="text-gray-800 dark:text-white/90">{entry.bank && entry.bank.title ? entry.bank.title : ""}</span></div>
            <div>Book No: <span className="text-gray-800 dark:text-white/90">{entry.cheque_book_no}</span></div>
            <div>Cheque Date: <span className="text-gray-800 dark:text-white/90">{formatDate(entry.cheque_date)}</span></div>
            <div>Amount: <span className="text-gray-800 dark:text-white/90">{formatMoney(entry.amount)}</span></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Put the cheque leaf in the printer; the text is printed on the places of the leaf.</p>

          {/* the leaf as it will be printed */}
          <div className="overflow-x-auto rounded-lg border border-dashed border-gray-300 bg-amber-50/40 dark:border-gray-700 dark:bg-white/[0.02]">
            <style>{LEAF_STYLE}</style>
            <div ref={printArea} className="cheque-leaf">
              <div className="body-area text-gray-900 dark:text-gray-100">
                <table className="date-area">
                  <tbody>
                    <tr>
                      {dateDigits.map((digit, index) => (
                        <td key={index}>{digit}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <div className="body-text">
                  <p className="text1">
                    <StarText text={entry.payment_name || ""} limit={58} />
                  </p>
                  <p className="text2">
                    {lines.inWord.length <= lines.firstLimit ? <StarText text={lines.firstLine} limit={lines.firstLimit} /> : lines.firstLine}
                    <span className="amount">{formatMoney(entry.amount)}</span>
                  </p>
                  <p className="text3">
                    <StarText text={lines.secondLine} limit={44} />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
