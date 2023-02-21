from contextlib import closing
import tkinter as tk
from tkinter import *
import datetime
from function import generate_scramble
from function import *

closingIs = True

def GUI():
    """
    Graphics for user
    """

    # vytvor okno
    root = tk.Tk()
    root.title("Rubik's Cube Scrambler")
    if closingIs:
        print("ss")
    # parametry okna
    window_width = 1000
    window_height = 600
    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x = int((screen_width/2) - (window_width/2))
    y = int((screen_height/2) - (window_height/2))
    root.geometry(f"{window_width}x{window_height}+{x}+{y}")

    # option bar pro typy kostek
    options = ["2x2x2", "3x3x3", "4x4x4", "5x5x5", "6x6x6", "7x7x7", "fewest moves", "Clock", "Megaminx", "Pyraminx", "Skewb", "Square-1", "4x4x4 naslepo", "5x5x5 naslepo"]
    size_var = tk.StringVar(value="3x3x3")

    #vyber scramblu
    size_scrollbar = tk.OptionMenu(root, size_var, *options)
    size_scrollbar["width"] = 15
    size_scrollbar.place(x=300, y=10)

    #prumer poslednich 3 solvu
    average3_label = tk.Label(root, text="Ao3: N/A", font=("Courier", 14))
    average3_label.place(x=880, y=1)

    #prumer poslednich 5 solvu
    average5_label = tk.Label(root, text="Ao5: N/A", font=("Courier", 14))
    average5_label.place(x=880, y=30)

    #prumer poslednich 12 solvu
    average12_label = tk.Label(root, text="Ao12: N/A", font=("Courier", 14))
    average12_label.place(x=870, y=60)


    #vygeneruj jiny scramble
    generate_button = tk.Button(root, text="Generate Scramble", command=display_scramble, width=17)
    generate_button.place(x=303, y=50)

    #ukaz scramble
    scramble_label = tk.Label(root, text="", font=("Courier", 14),justify = "center", width=70, height=10, borderwidth=2, relief="solid",)
    scramble_label.place(x= 10, y=100)

    display_scramble()

    #zapis zmereny cas
    vstup = tk.Entry(root, text="", font=("Courier", 50), justify='center', width='10', validate='all', validatecommand=check_entry)
    vstup.place(x=170, y=370)

    #pridej cas do listu
    pridej_button = tk.Button(root, text = "Pridej do listu",command=pridejAsmaz, state = "disabled")
    pridej_button.place(x=275, y=470)

    #proved to stejne jako tlacitko pridej_button
    vstup.bind('<Return>', on_entry_keypress)

    #smaz oznaceny cas
    smaz_button = tk.Button(root, text = "Smaz oznacene z listu",command=smaz_cas)
    smaz_button.place(x = 370, y = 470)

    pridej_button.config(command=lambda: (pridejAsmaz(), update_average_label()))
    smaz_button.config(command=lambda: (smaz_cas(), update_average_label()))
    #po stisknuti klavesy aktivu check_entry
    vstup.bind("<KeyRelease>", lambda event: check_entry())

    list_casu = tk.Listbox(width=14, height=31)
    list_casu.place(x=800, y=90)

    list_datumu = tk.Listbox(width = 17, height = 31)
    list_datumu.place(x=890, y = 90)

    instrukce_label = tk.Label(root, text = "Zapisujte ve tvaru mm:ss.ms!!!", font=("Courier", 14))
    instrukce_label.place(x=210, y = 330)

    nejlepsi_cas = tk.Label(root,text = "Nejlepsi cas: N/A", font=("Courier", 20))
    nejlepsi_cas.place(x=515, y = 25)

    root.protocol("VM_DELETE_WINDOW",on_closing)
    root.mainloop()

def on_entry_keypress(event):
    """
    Pressing enter
    """
    pridejAsmaz()


def display_scramble():
    """
    Display scramble
    """
    size = size_var.get()
    scramble = generate_scramble(size)
    scramble_label.config(text=scramble)
    return scramble

def on_closing():
    """
    Close a delete all widgets
    """
    print(closingIs)
    # code to delete everything
    closingIs = False
    root.destroy()

def smaz_cas():
    """
    Delete time
    """
    selected_index = list_casu.curselection()

    # jestli vybran cas
    if selected_index:
        # cas jako integer
        index = int(selected_index[0])
        # smaz ho
        list_casu.delete(index)
        # smaz odpovidajici datum
        list_datumu.delete(index)
        update_average_label()

    elif list_datumu.curselection():
        # jestli vybran datum
        selected_index = list_datumu.curselection()
        # datum jako integer
        index = int(selected_index[0])
        # smaz ho
        list_datumu.delete(index)
        # smaz odpovidajici cas
        list_casu.delete(index)
        update_average_label()
    najdi_nejlepsi_cas()


def pridej_cas():
    """
    add time to listbox
    """
    # vlozit novy cas na zacatek seznamu
    now = datetime.datetime.now()
    input_str = vstup.get()
    if ':' in input_str:
        # Input contains minutes and seconds
        minutes, seconds = input_str.split(':')
        total_time = int(minutes) * 60 + float(seconds)
    elif '.' in input_str:
        # Input contains seconds and milliseconds
        seconds, milliseconds = input_str.split('.')
        total_time = float(seconds) + float("0." + milliseconds)
    else:
        # Input contains only seconds
        total_time = float(input_str)
    # Add the total time to the listbox and convert it to mm:ss format
    cas_str = f"{int(total_time // 60):02d}:{total_time % 60:05.2f}"
    list_casu.insert(0, cas_str)
    datum_str = now.strftime("%d.%m.%Y %H:%M:%S")
    list_datumu.insert(0, datum_str)
    update_average_label()


def pridejAsmaz():
    """
    add, generate, and update labels
    """
    display_scramble()
    pridej_cas()
    vstup.delete(0, tk.END)
    check_entry()
    update_average_label()
    najdi_nejlepsi_cas()

def najdi_nejlepsi_cas():
    """
    Get all the items in the listbox as a tuple
    Convert the tuple to a list and convert each item to seconds
    """
    items = list_casu.get(0, tk.END)

    if not items:
        nejlepsi_cas.config(text="Nejlepsi cas: N/A")
        return

    seconds_list = []
    for item in items:
        minutes, seconds_and_ms = item.split(":")
        seconds, milliseconds = seconds_and_ms.split(".")
        total_seconds = int(minutes) * 60 + int(seconds) + int(milliseconds) / 100
        seconds_list.append(total_seconds)

    # Find the smallest number in the seconds list and print it
    smallest_seconds = min(seconds_list)
    nejlepsi_cas.config(text=f"Nejlepsi cas: {smallest_seconds:.2f}s")


def check_entry():
    if vstup.get():
        pridej_button.config(state="normal")
    else:
        pridej_button.config(state="disabled")



def update_average_label():
    """
    update all labels
    """
    # ziskej vsechny casy z listboxu
    items = list_casu.get(0, tk.END)
    times = [round(sum(x * float(t) for x, t in zip([60, 1], item.split(':')))) for item in items]

    # ziskej posledni tri casy z listboxu
    items = list_casu.get(0, tk.END)[:3]
    average_time = round(sum([sum(x * float(t) for x, t in zip([60, 1], item.split(':'))) for item in items]) / 3, 2)
    # spocitej prumer
    if len(items) == 3:
        average3_label.config(text=f"Ao3: {average_time:.2f}")
    else:
        average3_label.config(text="Ao3: N/A")
       
    # poslednich pet
    items = list_casu.get(0, tk.END)[:5]

    if len(items) == 5:
        average_time = round(sum([sum(x * float(t) for x, t in zip([60, 1], item.split(':'))) for item in items]) / 5, 2)
        average5_label.config(text=f"Ao5: {average_time:.2f}")
    else:
        average5_label.config(text="Ao5: N/A")

    # poslednich 12
    items = list_casu.get(0, tk.END)[:12]

    if len(items) == 12:
        average_time = round(sum([sum(x * float(t) for x, t in zip([60, 1], item.split(':'))) for item in items]) / 12, 2)
        average12_label.config(text=f"Ao12: {average_time:.2f}")
    else:
        average12_label.config(text="Ao12: N/A")

# vytvor okno
root = tk.Tk()
root.title("Rubik's Cube Scrambler")

# parametry okna
window_width = 1000
window_height = 600
screen_width = root.winfo_screenwidth()
screen_height = root.winfo_screenheight()
x = int((screen_width/2) - (window_width/2))
y = int((screen_height/2) - (window_height/2))
root.geometry(f"{window_width}x{window_height}+{x}+{y}")

# option bar pro typy kostek
options = ["2x2x2", "3x3x3", "4x4x4", "5x5x5", "6x6x6", "7x7x7", "fewest moves", "Clock", "Megaminx", "Pyraminx", "Skewb", "Square-1", "4x4x4 naslepo", "5x5x5 naslepo"]
size_var = tk.StringVar(value="3x3x3")

#vyber scramblu
size_scrollbar = tk.OptionMenu(root, size_var, *options)
size_scrollbar["width"] = 15
size_scrollbar.place(x=300, y=10)

#prumer poslednich 3 solvu
average3_label = tk.Label(root, text="Ao3: N/A", font=("Courier", 14))
average3_label.place(x=880, y=1)

#prumer poslednich 5 solvu
average5_label = tk.Label(root, text="Ao5: N/A", font=("Courier", 14))
average5_label.place(x=880, y=30)

#prumer poslednich 12 solvu
average12_label = tk.Label(root, text="Ao12: N/A", font=("Courier", 14))
average12_label.place(x=870, y=60)


#vygeneruj jiny scramble
generate_button = tk.Button(root, text="Generate Scramble", command=display_scramble, width=17)
generate_button.place(x=303, y=50)

#ukaz scramble
scramble_label = tk.Label(root, text="", font=("Courier", 14),justify = "center", width=70, height=10, borderwidth=2, relief="solid",)
scramble_label.place(x= 10, y=100)

display_scramble()

#zapis zmereny cas
vstup = tk.Entry(root, text="", font=("Courier", 50), justify='center', width='10', validate='all', validatecommand=check_entry)
vstup.place(x=170, y=370)

#pridej cas do listu
pridej_button = tk.Button(root, text = "Pridej do listu",command=pridejAsmaz, state = "disabled")
pridej_button.place(x=275, y=470)

#proved to stejne jako tlacitko pridej_button
vstup.bind('<Return>', on_entry_keypress)

#smaz oznaceny cas
smaz_button = tk.Button(root, text = "Smaz oznacene z listu",command=smaz_cas)
smaz_button.place(x = 370, y = 470)

pridej_button.config(command=lambda: (pridejAsmaz(), update_average_label()))
smaz_button.config(command=lambda: (smaz_cas(), update_average_label()))
#po stisknuti klavesy aktivu check_entry
vstup.bind("<KeyRelease>", lambda event: check_entry())

list_casu = tk.Listbox(width=14, height=31)
list_casu.place(x=800, y=90)

list_datumu = tk.Listbox(width = 17, height = 31)
list_datumu.place(x=890, y = 90)

instrukce_label = tk.Label(root, text = "Zapisujte ve tvaru mm:ss.ms!!!", font=("Courier", 14))
instrukce_label.place(x=210, y = 330)

nejlepsi_cas = tk.Label(root,text = "Nejlepsi cas: N/A", font=("Courier", 20))
nejlepsi_cas.place(x=515, y = 25)

root.mainloop()
