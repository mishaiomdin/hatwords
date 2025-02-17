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

const saved_parameters = ['cols', 'rows', 'pages', 'font', 'font-size', 'color', 'level'];

// Save parameters to localStorage
function saveParameters() {
    saved_parameters.forEach(param => {
        localStorage.setItem(param, document.getElementById(param).value);
    });
}

// Load parameters from localStorage
function loadParameters() {
    saved_parameters.forEach(param => {
        const savedValue = localStorage.getItem(param);
        if (savedValue) document.getElementById(param).value = savedValue;
    });

    // Apply font styling after loading
    const savedFont = localStorage.getItem('font');
    if (savedFont) document.getElementById('font').style.fontFamily = savedFont;
}

// Add event listeners dynamically
saved_parameters.forEach(param => {
    document.getElementById(param).addEventListener('input', saveParameters);
});


window.onload = function () {
    populateFontDropdown();
    loadParameters();
    addFontFaces();
    const savedLanguage = localStorage.getItem('language') || 'en';
    document.getElementById("languageSelector").value = savedLanguage;
    updateWordCount();
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

    // Get user input
    const dictionary = document.getElementById("dictionary").value; // Roman or Moscow
    const level = document.getElementById("level").value; // easy, medium, hard
    const cols = parseInt(document.getElementById("cols").value, 10);
    const rows = parseInt(document.getElementById("rows").value, 10);
    const numPages = parseInt(document.getElementById("pages").value, 10);
    const selectedFont = document.getElementById("font").value;
    const fontSize = parseInt(document.getElementById("font-size").value, 10);
    const color = document.getElementById("color").value;

    // Page dimensions
    const pageWidth = 595, pageHeight = 842; // A4 size
    const rectWidth = pageWidth / cols, rectHeight = pageHeight / rows;

    // Set font URL based on selection
    let fontUrl = `fonts/${selectedFont}.ttf`;

    try {
        // Fetch the selected font and process it
        const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
        const font = await pdfDoc.embedFont(fontBytes);

        // Fetch words from the selected dictionary and difficulty level
        let wordListUrl = `wordlists/${dictionary}/${level}.json`; // e.g., wordlists/Roman/easy.json
        const response = await fetch(wordListUrl);
        let allWords = await response.json(); // JSON is just an array

        if (!Array.isArray(allWords) || allWords.length === 0) {
            showError(`Word list is empty or invalid for dictionary: ${dictionary}, level: ${level}`);
            return;
        }

        // Total number of words needed
        const totalWords = cols * rows * numPages;

        // Get unique words without repetition
        let words = getUniqueRandomWords(allWords, totalWords);
        if (!words) {
            showError(`Not enough words available! Required: ${totalWords}, Available: ${allWords.length}`);
            return;
        }

        let wordIndex = 0;

        // Loop through the required number of pages
        for (let pageNum = 0; pageNum < numPages; pageNum++) {
            const page = pdfDoc.addPage([pageWidth, pageHeight]);
            const { width, height } = page.getSize();

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    if (wordIndex >= words.length) break;
                    let x = col * rectWidth, y = height - (row + 1) * rectHeight;

                    page.drawRectangle({ 
                        x, y, 
                        width: rectWidth, 
                        height: rectHeight, 
                        borderColor: rgb(0, 0, 0), 
                        borderWidth: 1 
                    });

                    // Get a fitting word
                    let word = getFittingWord(words[wordIndex], allWords, font, fontSize, rectWidth);
                    if (!word) continue; // If no suitable word is found, skip

                    // Center the text inside the rectangle
                    const textWidth = font.widthOfTextAtSize(word, fontSize);
                    const textHeight = font.heightAtSize(fontSize);
                    const textX = x + (rectWidth - textWidth) / 2;  // Horizontal centering
                    const textY = y + (rectHeight - textHeight) / 2 + textHeight / 4;  // Vertical centering

                    page.drawText(word, { 
                        x: textX, 
                        y: textY, 
                        size: fontSize, 
                        font, 
                        color: rgb(
                            parseInt(color.slice(1, 3), 16) / 255, 
                            parseInt(color.slice(3, 5), 16) / 255, 
                            parseInt(color.slice(5, 7), 16) / 255
                        ) 
                    });

                    wordIndex++;
                }
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
        showError('Error while generating PDF: ' + error.message);
    }
}

/**
 * Finds a word that fits within the given box width.
 * If the word is too long, it selects a shorter one from the list.
 */
function getFittingWord(word, wordList, font, fontSize, maxWidth) {
    let textWidth = font.widthOfTextAtSize(word, fontSize);

    // If the word fits, return it
    if (textWidth <= maxWidth) {
        return word;
    }

    // Try to find a shorter replacement word
    for (let candidate of wordList) {
        if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
            return candidate;
        }
    }

    // If no suitable replacement is found, return null (word will be skipped)
    return null;
}



/**
 * Get a specified number of unique random words from the available list.
 * Ensures words are not repeated across pages.
 * 
 * @param {Array} allWords - List of all possible words.
 * @param {number} count - Number of words required.
 * @returns {Array|null} - Array of unique words or null if not enough words are available.
 */
function getUniqueRandomWords(allWords, count) {
    if (allWords.length < count) return null; // Not enough words

    // Shuffle words and take only the required amount
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
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

async function changeLanguage() {
    const lang = document.getElementById("languageSelector").value;
    localStorage.setItem('language', lang); // Save selected language

    try {
        const response = await fetch('translations.json');
        const translations = await response.json();

        if (!translations[lang]) {
            console.error("Language not found:", lang);
            return;
        }

        // Apply translations dynamically
        Object.entries(translations[lang]).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) element.textContent = value;
        });
    } catch (error) {
        console.error("Error loading translations:", error);
    }
}

function updateWordCount() {
    const cols = parseInt(document.getElementById("cols").value, 10) || 1;
    const rows = parseInt(document.getElementById("rows").value, 10) || 1;
    const pages = parseInt(document.getElementById("pages").value, 10) || 1;

    const totalWords = cols * rows * pages;
    document.getElementById("wordCountDisplay").textContent = totalWords;
}

// Run on page load to ensure the correct value is displayed
document.addEventListener("DOMContentLoaded", updateWordCount);


