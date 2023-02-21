import random
from gui import *

def generate_scramble(size):
    """
    moves to all possibles scrambles and create scramble
    """
    if size == "2x2x2":
        num_moves = 6
        moves = ["U", "R", "F"]

    elif size == "3x3x3":
        num_moves = 20
        moves = ["U", "D", "R", "L", "F", "B"]

    elif size == "4x4x4":
        num_moves = 40
        moves = ["U", "D", "R", "L", "F", "B", "u", "d", "r", "l", "f", "b"]

    elif size == "5x5x5":
        num_moves = 60
        moves = ["U", "D", "R", "L", "F", "B", "u", "d", "r", "l", "f", "b", "3Uw", "3Dw", "3Rw", "3Lw", "3Fw", "3Bw"]

    elif size == "6x6x6":
        num_moves = 80
        moves = ["U", "D", "R", "L", "F", "B", "u", "d", "r", "l", "f", "b", "3Uw", "3Dw", "3Rw", "3Lw", "3Fw", "3Bw", "4Uw", "4Dw", "4Rw", "4Lw", "4Fw", "4Bw"]

    elif size == "7x7x7":
        num_moves = 100
        moves = ["U", "D", "R", "L", "F", "B", "u", "d", "r", "l", "f", "b", "3Uw", "3Dw", "3Rw", "3Lw", "3Fw", "3Bw", "4Uw", "4Dw", "4Rw", "4Lw", "4Fw", "4Bw", "5Uw", "5Dw", "5Rw", "5Lw", "5Fw", "5Bw"]

    elif size == "fewest moves":
        num_moves = random.randint(23, 40)
        moves = ["U", "D", "R", "L", "F", "B"]

    elif size == "Clock":
        num_moves = 17
        moves = ["U", "D", "L", "R", "B", "F", "X"]

    elif size == "Megaminx":
        num_moves = 75
        moves = ["U", "D", "R", "L", "F", "B", "Uw", "Dw", "Rw", "Lw", "Fw", "Bw"]


    elif size == "Pyraminx":
        num_moves = 10
        moves = ["U","R", "L", "B"]

    elif size == "Skewb":
        num_moves = 10
        moves = ["R", "L", "U", "D", "B", "F"]

    elif size == "Square-1":
        num_moves = 20
        moves = ["U",  "D",  "R", "L", "x",  "y", "z"]

    elif size == "4x4x4 naslepo":
        num_moves = 40
        moves = ["U", "D", "R", "L", "F", "B"]

    elif size == "5x5x5 naslepo":
        num_moves = 60
        moves = ["U", "D", "R", "L", "F", "B", "u", "d", "r", "l", "f", "b"]


    prev_move = None
    scramble = ""

    for i in range(num_moves):
        move = random.choice(moves)
        while prev_move is not None and move[0] == prev_move[0]:
            move = random.choice(moves)

        #urci nahodnost pohybu
        if random.random() < 0.5:
            move += "'"
        elif random.random() < 0.5:
            move += "2"
        
        #pridej pohyb a napis za nej mezeru pro prehlednost
        scramble += move + " "

        # updatni predchozi move
        prev_move = move

        # pridat zalomeni radku za polovinu pro 4x4 a vetsi scramble na vice radku
        if size == "4x4x4" and i == num_moves // 2 or size == "fewest moves" and i == num_moves // 2 or size == "4x4x4 naslepo" and i == num_moves // 2:
            scramble += "\n"
        elif size == "5x5x5" or size == "5x5x5 naslepo":
            if i == num_moves // 3 or i == 2 * (num_moves // 3):
                scramble += "\n"
        elif size == "6x6x6" or size == "Megaminx":
            if i % (num_moves // 6) == 0 and i != 0:
                scramble += "\n"  
        elif size == "7x7x7":
            if i % 14 == 0 and i != 0:
                scramble += "\n" 
    return scramble

