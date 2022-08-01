import sqlite3
from itertools import count, filterfalse

db_name = "student_db"+".db"
table_name = "student"

def create_table():
    conn = sqlite3.connect(db_name)
    cur = conn.cursor()

    sql = f'SELECT * from sqlite_master WHERE type="table" AND name="{table_name}"'
    cur.execute(sql)
    rows = cur.fetchall()

    if not rows:
        sql = f'CREATE TABLE {table_name} (st_id INTEGER, st_name CHAR(255), arduino_id INTEGER NOT NULL DEFAULT -1, st_state CHAR(1) NOT NULL DEFAULT 1 );'
    cur.execute(sql)
    conn.commit()
    
    conn.close()

def get_students():
    conn = sqlite3.connect(db_name)
    cur = conn.cursor()

    cur.execute(f"SELECT st_id, st_name, st_state FROM {table_name}")
    
    rows = cur.fetchall()

    conn.close()

    rows = sorted(rows, key=lambda x:x[0])
    rows = list(map(lambda x: dict(zip(["st_id", "st_name", "st_state"], x)), rows))
    return rows

def get_student(st_id:int):
    conn = sqlite3.connect(db_name)
    cur = conn.cursor()

    cur.execute(f"SELECT st_id FROM {table_name} WHERE st_id={st_id}")

    rows = cur.fetchall()

    conn.close()

    rows = [i[0] for i in rows]

    return rows

def add_student(st_id:int, st_name:str, arduino_id:int):
    conn = sqlite3.connect(db_name)
    cur = conn.cursor()

    cur.execute(f"INSERT INTO {table_name} VALUES(?, ?, ?, 1)", (st_id, st_name, arduino_id))

    conn.commit()

    conn.close()

def change_state(arduino_id:int):
    conn = sqlite3.connect(db_name)
    cur = conn.cursor()

    cur.execute(f"SELECT st_state FROM {table_name} WHERE arduino_id={arduino_id}")
    rows = cur.fetchall()
    
    cur.execute(f"UPDATE {table_name} SET st_state={not int(rows[0][0])} WHERE arduino_id={arduino_id}")
    
    conn.commit()

    cur.execute(f"SELECT st_id, st_name, st_state FROM {table_name} WHERE arduino_id={arduino_id}")

    rows = cur.fetchall()
    
    conn.close()
    return dict(zip(["st_id", "st_name", "st_state"], [i for i in rows[0]]))

def get_empty_arduino_id():
    conn = sqlite3.connect(db_name)
    cur = conn.cursor()
    
    cur.execute(f"SELECT arduino_id FROM {table_name}")

    rows = cur.fetchall()

    conn.close()
    
    rows = [i[0] for i in rows]
    return next(filterfalse(set(rows).__contains__, count(1)))

def get_arduino_id(st_id:int):
    conn = sqlite3.connect(db_name)
    cur = conn.cursor()

    cur.execute(f"SELECT arduino_id FROM {table_name} WHERE st_id={st_id}")

    rows = cur.fetchall()

    conn.close()

    return rows[0][0]

def delete_student(st_id:int):
    conn = sqlite3.connect(db_name)
    cur = conn.cursor()

    cur.execute(f"DELETE FROM {table_name} WHERE st_id={st_id}")

    conn.commit()

    conn.close()
