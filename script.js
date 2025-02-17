let pdfBlobUrl = null;
let fonts = ['Arial', 'Georgia', 'Garamond', 'Roboto', 'Rubik'];


function populateFontDropdown() {
    const fontSelect = document.getElementById("font");
    fontSelect.innerHTML = ""; // Clear existing options

    fonts.forEach(font => {
        const option = document.createElement("option");
        option.value = font;
        option.textContent = font;
        option.style.fontFamily = font;
        fontSelect.appendChild(option);
    });

    // Apply the saved font if it exists
    const savedFont = localStorage.getItem("font");
    if (savedFont) {
        fontSelect.value = savedFont;
        fontSelect.style.fontFamily = savedFont;
    }
}

// Ensure the dropdown updates when a font is selected
document.getElementById('font').addEventListener('change', function () {
    saveParameters();
    this.style.fontFamily = this.value;
});


function addFontFaces() {
    const style = document.createElement("style");
    fonts.forEach(font => {
        style.innerHTML += `
            @font-face {
                font-family: "${font}";
                src: url("fonts/${font}.ttf") format("truetype");
            }
        `;
    });
    document.head.appendChild(style);
}


// Save parameters to localStorage
function saveParameters() {
    localStorage.setItem('cols', document.getElementById('cols').value);
    localStorage.setItem('rows', document.getElementById('rows').value);
    localStorage.setItem('font', document.getElementById('font').value);
    localStorage.setItem('font-size', document.getElementById('font-size').value);
    localStorage.setItem('color', document.getElementById('color').value);
    localStorage.setItem('level', document.getElementById('level').value);
    document.getElementById('font').addEventListener('change', function () {
    saveParameters();
    this.style.fontFamily = this.value;
});
}

// Load parameters from localStorage
function loadParameters() {
    const savedCols = localStorage.getItem('cols');
    const savedRows = localStorage.getItem('rows');
    const savedFont = localStorage.getItem('font');
    const savedFontSize = localStorage.getItem('font-size');
    const savedColor = localStorage.getItem('color');
    const savedLevel = localStorage.getItem('level');

    if (savedCols) document.getElementById('cols').value = savedCols;
    if (savedRows) document.getElementById('rows').value = savedRows;
    if (savedFont) document.getElementById('font').value = savedFont;
    if (savedFontSize) document.getElementById('font-size').value = savedFontSize;
    if (savedColor) document.getElementById('color').value = savedColor;
    if (savedLevel) document.getElementById('level').value = savedLevel;

    if (savedFont) {
    document.getElementById('font').value = savedFont;
    document.getElementById('font').style.fontFamily = savedFont;
}
}


window.onload = function () {
    populateFontDropdown();
    loadParameters();
    addFontFaces();
    const savedLanguage = localStorage.getItem('language') || 'en';
    document.getElementById("languageSelector").value = savedLanguage;
    changeLanguage();
};


// Add event listeners to save parameters as soon as they change
document.getElementById('cols').addEventListener('input', saveParameters);
document.getElementById('rows').addEventListener('input', saveParameters);
document.getElementById('font').addEventListener('change', saveParameters);
document.getElementById('font-size').addEventListener('input', saveParameters);
document.getElementById('color').addEventListener('input', saveParameters);
document.getElementById('level').addEventListener('change', saveParameters);

// Function to show error messages
function showError(errorMessage) {
    const errorBox = document.getElementById('error-box');
    if (errorMessage) {
        errorBox.style.display = 'block';
        errorBox.textContent = errorMessage;
    } else {
        errorBox.style.display = 'none';  // Hide the error box when no error
    }
}

// Generate PDF dynamically based on selected options
async function generatePdf(action) {
    // Clear any previous error message
    showError('');

    // Save parameters before generating the PDF
    saveParameters();

    if (!window.PDFLib) {
        showError("pdf-lib isn't loaded");
        return;
    }
    if (!window.fontkit) {
        showError("fontkit isn't loaded");
        return;
    }

    const { PDFDocument, rgb } = window.PDFLib;
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(window.fontkit); // Register fontkit

    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();

    // Get the number of columns and rows from input
    const cols = parseInt(document.getElementById("cols").value, 10);
    const rows = parseInt(document.getElementById("rows").value, 10);

    const rectWidth = width / cols, rectHeight = height / rows;

    // Get font, font size, and color from input
    const selectedFont = document.getElementById("font").value;
    const fontSize = parseInt(document.getElementById("font-size").value, 10);
    const color = document.getElementById("color").value;

    // Set font URL based on selection
    let fontUrl = `fonts/${selectedFont}.ttf`;

    try {
        // Fetch the selected font and process it
        const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
        const font = await pdfDoc.embedFont(fontBytes);

        // Fetch words based on selected difficulty level
        const level = document.getElementById("level").value;
        let wordListUrl = "";
        if (level === "easy") {
            wordListUrl = "wordlists/easy.txt";
        } else if (level === "medium") {
            wordListUrl = "wordlists/medium.txt";
        } else if (level === "hard") {
            wordListUrl = "wordlists/hard.txt";
        }

        const response = await fetch(wordListUrl);
        const text = await response.text();
        const lines = text.split('\n');  // Split the text into lines
        const randomLines = getRandomLines(lines, cols * rows);  // Select cols * rows random lines
        const words = randomLines;

        let wordIndex = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (wordIndex >= words.length) break;
                let x = col * rectWidth, y = height - (row + 1) * rectHeight;

                page.drawRectangle({ x, y, width: rectWidth, height: rectHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });

                // Center the text horizontally and vertically
                const textWidth = font.widthOfTextAtSize(words[wordIndex], fontSize);
                const textHeight = font.heightAtSize(fontSize);
                const textX = x + (rectWidth - textWidth) / 2;  // Horizontal centering
                const textY = y + (rectHeight - textHeight) / 2 + textHeight / 4;  // Vertical centering

                page.drawText(words[wordIndex], { x: textX, y: textY, size: fontSize, font, color: rgb(parseInt(color.slice(1, 3), 16) / 255, parseInt(color.slice(3, 5), 16) / 255, parseInt(color.slice(5, 7), 16) / 255) });

                wordIndex++;
            }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        pdfBlobUrl = URL.createObjectURL(blob);

        // Handle different actions based on button clicked
        if (action === 'download') {
            downloadPdf();
        } else if (action === 'show') {
            showPdf();
        } else if (action === 'print') {
            printPdf();
        }

        // Hide error box if no errors occurred
        showError('');

    } catch (error) {
        showError('Ошибка при создании PDF: ' + error.message);
    }
}

// Function to download the PDF
function downloadPdf() {
    const link = document.createElement("a");
    link.href = pdfBlobUrl;
    link.download = "output.pdf";
    link.click();
}

// Function to show the generated PDF in a new tab
function showPdf() {
    if (pdfBlobUrl) {
        window.open(pdfBlobUrl, '_blank');
    }
}

// Function to print the generated PDF
function printPdf() {
    if (pdfBlobUrl) {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        iframe.src = pdfBlobUrl;
        document.body.appendChild(iframe);
        iframe.contentWindow.print();
    }
}

// Function to get a specified number of random lines from an array
function getRandomLines(array, count) {
    const shuffled = [...array].sort(() => Math.random() - 0.5);  // Shuffle the array
    return shuffled.slice(0, count);  // Return the first 'count' lines
}

function changeLanguage() {
    const lang = document.getElementById("languageSelector").value;
    localStorage.setItem('language', lang); // Save selected language

    const translations = {
        en: {
            title: "Hat words generator",
            settingsTitle: "PDF Generation Settings",
            colsLabel: "Columns: ",
            rowsLabel: "Rows: ",
            fontLabel: "Font: ",
            fontSizeLabel: "Font Size: ",
            colorLabel: "Color: ",
            levelLabel: "Difficulty Level: ",
            downloadBtn: "Download PDF",
            showPdfBtn: "Show PDF in a New Tab",
            printBtn: "Print PDF",
            footerText: "by: Misha Iomdin"
        },
        ru: {
            title: "Генератор слов для «Шляпы»",
            settingsTitle: "Настройки для создания PDF",
            colsLabel: "Колонки: ",
            rowsLabel: "Строки: ",
            fontLabel: "Шрифт: ",
            fontSizeLabel: "Размер шрифта: ",
            colorLabel: "Цвет: ",
            levelLabel: "Уровень сложности: ",
            downloadBtn: "Скачать PDF",
            showPdfBtn: "Показать PDF в новой вкладке",
            printBtn: "Распечатать PDF",
            footerText: "сайт: Миша Иомдин"
        }
    };

    document.getElementById("title").textContent = translations[lang].title;
    document.getElementById("settingsTitle").textContent = translations[lang].settingsTitle;
    document.getElementById("colsLabel").textContent = translations[lang].colsLabel;
    document.getElementById("rowsLabel").textContent = translations[lang].rowsLabel;
    document.getElementById("fontLabel").textContent = translations[lang].fontLabel;
    document.getElementById("fontSizeLabel").textContent = translations[lang].fontSizeLabel;
    document.getElementById("colorLabel").textContent = translations[lang].colorLabel;
    document.getElementById("levelLabel").textContent = translations[lang].levelLabel;
    document.getElementById("downloadBtn").textContent = translations[lang].downloadBtn;
    document.getElementById("showPdfBtn").textContent = translations[lang].showPdfBtn;
    document.getElementById("printBtn").textContent = translations[lang].printBtn;
    document.getElementById("footerText").textContent = translations[lang].footerText;
}
