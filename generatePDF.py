from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

import random

def create_pdf(words, filename="output.pdf", cols=3, rows=5, font="Georgia", font_size=20):

    pdfmetrics.registerFont(TTFont('Georgia', 'fonts/georgia.ttf'))


    width, height = A4  # Standard A4 size
    c = canvas.Canvas(filename, pagesize=A4)
    rect_width = width / cols
    rect_height = height / rows
    
    word_index = 0
    for row in range(rows):
        for col in range(cols):
            if word_index >= len(words):
                break
            x = col * rect_width
            y = height - (row + 1) * rect_height
            
            # Draw rectangle
            c.setStrokeColor(colors.black)
            c.setLineWidth(1)
            c.rect(x, y, rect_width, rect_height)
            
            # Place text in the center
            text_x = x + rect_width / 2
            text_y = y + rect_height / 2
            c.setFont(font, font_size)
            c.drawCentredString(text_x, text_y, words[word_index])
            
            word_index += 1
    
    c.save()
    print(f"PDF saved as {filename}")

# Example usage

COLS = 3
ROWS = 20
FONT = "Georgia"
FONT_SIZE = 20
WORDLIST_FILE = "wordlists/easy.txt"

with open(WORDLIST_FILE) as file:
    wordlist = [x.strip() for x in file.readlines()]

words = random.sample(wordlist, COLS * ROWS)

create_pdf(words, cols=COLS, rows=ROWS, font_size=FONT_SIZE, font=FONT)