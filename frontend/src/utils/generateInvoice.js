import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ──────────────────────────────────────────────────────────────────────────────
// COMPANY (SELLER) DETAILS — "Bill To" on the invoice
// ──────────────────────────────────────────────────────────────────────────────
const COMPANY = {
    name: 'SAVVY BUCKET PRIVATE LIMITED',
    address: 'UNCHAGAON ROAD, TEHSIL BALLABGARH',
    city: 'BALLABGARH',
    district: 'Faridabad',
    state: 'Haryana',
    pinCode: '121004',
    country: 'India',
    gstin: 'NA',   // Replace with actual GSTIN if available
    pan: 'NA',     // Replace with actual PAN if available
    email: 'support@savvybucket.com',
    phone: 'NA',
};

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────
const NA = (v) => (v && String(v).trim() !== '' ? String(v).trim() : 'NA');

function numberToWords(num) {
    if (!num || isNaN(num)) return 'NA';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertHundreds(n) {
        let result = '';
        if (n >= 100) { result += ones[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
        if (n >= 20) { result += tens[Math.floor(n / 10)] + ' '; n %= 10; }
        if (n > 0) result += ones[n] + ' ';
        return result;
    }

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const rest = num % 1000;
    const paise = Math.round((num - Math.floor(num)) * 100);

    let words = '';
    if (crore > 0) words += convertHundreds(crore) + 'Crore ';
    if (lakh > 0) words += convertHundreds(lakh) + 'Lakh ';
    if (thousand > 0) words += convertHundreds(thousand) + 'Thousand ';
    if (rest > 0) words += convertHundreds(rest);

    words = words.trim();
    if (paise > 0) words += ' and ' + convertHundreds(paise).trim() + ' Paise';
    return words + ' Only';
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ──────────────────────────────────────────────────────────────────────────────
export function generateInvoice(order) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PAGE_W = 210;
    const PAGE_H = 297;
    const MARGIN = 14;
    const COL2_X = PAGE_W / 2 + 4; // Right column start

    // ── Colours ────────────────────────────────────────────────────────────────
    const GREEN = [22, 101, 52];   // dark green
    const LIGHT_GREEN = [220, 252, 231]; // very light green bg
    const GREY = [100, 116, 139];
    const DARK = [15, 23, 42];
    const LINE_COLOR = [226, 232, 240];

    let y = MARGIN;

    // ── Helper: draw a thin horizontal rule ────────────────────────────────────
    function hr(yPos, color = LINE_COLOR) {
        doc.setDrawColor(...color);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, yPos, PAGE_W - MARGIN, yPos);
        return yPos + 3;
    }

    // ── Helper: bold label + normal value ──────────────────────────────────────
    function labelValue(label, value, x, yPos, labelW = 28) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...GREY);
        doc.text(label + ':', x, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
        doc.text(NA(value), x + labelW, yPos);
        return yPos + 5;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HEADER BAR
    // ══════════════════════════════════════════════════════════════════════════
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, PAGE_W, 16, 'F');

    // Logo / Brand name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('SAVVY BUCKET', MARGIN, 10.5);

    // TAX INVOICE label on right
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('TAX INVOICE', PAGE_W - MARGIN, 10.5, { align: 'right' });

    y = 22;

    // ══════════════════════════════════════════════════════════════════════════
    // INVOICE META (right side) + COMPANY RIGHT BLOCK
    // ══════════════════════════════════════════════════════════════════════════
    const invoiceDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const invoiceDateStr = invoiceDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const invoiceNo = 'SB/' + invoiceDate.getFullYear().toString().slice(-2) + '/' + order._id?.slice(-6).toUpperCase();

    // Right block: invoice details
    const rightMeta = [
        ['Invoice #', invoiceNo],
        ['Invoice Date', invoiceDateStr],
        ['Terms', 'Net 30'],
        ['Order Status', NA(order.orderStatus)],
        ['Payment Ref', NA(order.easebuzzTransactionId)],
    ];

    doc.setFontSize(7.5);
    let ry = y;
    rightMeta.forEach(([label, val]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GREY);
        doc.text(label, COL2_X, ry);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
        doc.text(val, PAGE_W - MARGIN, ry, { align: 'right' });
        ry += 5;
    });

    // ══════════════════════════════════════════════════════════════════════════
    // BILL TO / SHIP TO SECTION
    // ══════════════════════════════════════════════════════════════════════════
    y = ry + 4;
    y = hr(y, GREEN);

    // Section heading bg
    doc.setFillColor(...LIGHT_GREEN);
    doc.rect(MARGIN, y - 1, (PAGE_W / 2 - MARGIN - 4), 7, 'F');
    doc.rect(COL2_X - 2, y - 1, (PAGE_W - COL2_X - MARGIN + 2), 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GREEN);
    doc.text('BILL TO', MARGIN + 2, y + 4);
    doc.text('SHIP TO', COL2_X, y + 4);
    y += 9;

    // Bill To — Company info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(COMPANY.name, MARGIN, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    const billLines = [
        COMPANY.address,
        COMPANY.city,
        COMPANY.district + ', ' + COMPANY.state + ' ' + COMPANY.pinCode,
        COMPANY.country,
        'GSTIN: ' + COMPANY.gstin,
        'PAN: ' + COMPANY.pan,
    ];
    billLines.forEach(line => {
        doc.text(NA(line), MARGIN, y);
        y += 4.2;
    });

    // Ship To — Customer shipping address
    const addr = order.shippingAddress || {};
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);

    let sy = y - (4.2 * billLines.length) - 5 + 5; // align with Bill To start
    doc.text(NA(addr.fullName || order.buyerId?.name), COL2_X, sy);
    sy += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    const shipLines = [
        addr.addressLine1,
        addr.addressLine2,
        addr.city,
        (addr.state ? addr.state : '') + (addr.pinCode ? ' ' + addr.pinCode : ''),
        addr.country || 'India',
        'Phone: ' + NA(addr.phone),
    ].filter(l => l && l.trim() !== '');

    shipLines.forEach(line => {
        doc.text(NA(line), COL2_X, sy);
        sy += 4.2;
    });

    // Ensure y is past both columns
    y = Math.max(y, sy) + 4;

    // ══════════════════════════════════════════════════════════════════════════
    // PLACE OF SUPPLY
    // ══════════════════════════════════════════════════════════════════════════
    y = hr(y);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREY);
    doc.text('Place of Supply:', MARGIN, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(NA(addr.state || COMPANY.state), MARGIN + 30, y + 4);
    y += 10;

    // ══════════════════════════════════════════════════════════════════════════
    // ITEMS TABLE
    // ══════════════════════════════════════════════════════════════════════════
    const product = order.productId || {};
    const gstPct = product.gstPercentage || 0;
    const baseAmount = order.totalAmount
        ? Math.round(order.totalAmount / (1 + gstPct / 100))
        : 0;
    const gstAmount = order.totalAmount ? order.totalAmount - baseAmount : 0;

    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['#', 'Item', 'Description', 'HSN/SAC', 'Qty', 'Rate (₹)', `IGST ${gstPct}%`, 'Amount (₹)']],
        body: [
            [
                '1',
                NA(product.title),
                NA(product.description ? product.description.slice(0, 40) : null),
                NA(product.hsnCode),
                NA(order.quantity),
                baseAmount.toFixed(2),
                gstAmount.toFixed(2),
                (baseAmount).toFixed(2),
            ]
        ],
        theme: 'plain',
        headStyles: {
            fillColor: GREEN,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.5,
            cellPadding: 2.5,
        },
        bodyStyles: {
            fontSize: 7.5,
            cellPadding: 2.5,
            textColor: DARK,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 30 },
            2: { cellWidth: 50 },
            3: { cellWidth: 20 },
            4: { cellWidth: 10, halign: 'center' },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 22, halign: 'right' },
            7: { cellWidth: 22, halign: 'right' },
        },
    });

    y = doc.lastAutoTable.finalY + 2;

    // ══════════════════════════════════════════════════════════════════════════
    // TOTALS SECTION
    // ══════════════════════════════════════════════════════════════════════════
    const totalsX = PAGE_W - MARGIN - 80;
    const valX = PAGE_W - MARGIN;

    function totalsRow(label, value, bold = false) {
        if (bold) {
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(...LIGHT_GREEN);
            doc.rect(totalsX - 2, y - 3, 80 + 2, 7, 'F');
        } else {
            doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        doc.text(label, totalsX, y);
        doc.text(value, valX, y, { align: 'right' });
        y += 6;
    }

    y = hr(y, LINE_COLOR) + 2;

    totalsRow('Sub Total', '₹' + baseAmount.toFixed(2));
    totalsRow(`IGST ${gstPct}% `, '₹' + gstAmount.toFixed(2));
    y += 1;
    y = hr(y, GREEN) + 2;
    totalsRow('Total', '₹' + (order.totalAmount || 0).toFixed(2), true);
    y += 1;
    totalsRow('Balance Due', '₹' + (order.totalAmount || 0).toFixed(2), true);

    // ══════════════════════════════════════════════════════════════════════════
    // AMOUNT IN WORDS
    // ══════════════════════════════════════════════════════════════════════════
    y += 4;
    doc.setFillColor(...LIGHT_GREEN);
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, PAGE_W - 2 * MARGIN, 12, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GREEN);
    doc.text('Total In Words:', MARGIN + 3, y + 5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...DARK);
    const words = numberToWords(Math.round(order.totalAmount || 0));
    doc.text('Indian Rupee ' + words, MARGIN + 30, y + 5);

    // ══════════════════════════════════════════════════════════════════════════
    // FOOTER
    // ══════════════════════════════════════════════════════════════════════════
    y += 18;
    y = hr(y, LINE_COLOR);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.text('Thank you for shopping with Savvy Bucket. For queries: ' + COMPANY.email, PAGE_W / 2, y + 4, { align: 'center' });
    doc.text('This is a computer-generated invoice and does not require a physical signature.', PAGE_W / 2, y + 8, { align: 'center' });

    // ── Green bottom bar ────────────────────────────────────────────────────
    doc.setFillColor(...GREEN);
    doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('savvybucket.com', PAGE_W / 2, PAGE_H - 3, { align: 'center' });

    // ══════════════════════════════════════════════════════════════════════════
    // SAVE
    // ══════════════════════════════════════════════════════════════════════════
    doc.save(`SavvyBucket_Invoice_${order._id?.slice(-8).toUpperCase() || 'BILL'}.pdf`);
}
