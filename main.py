import pytz
import datetime
import csv
from threading import Thread
from mimetypes import add_type
from flask import Flask, render_template
from flask_socketio import SocketIO
import DB as db
import serial

F_CHECK = b'c'
F_DELETE = b'd'
F_ENROLL = b'e'

branch = F_CHECK

add_type('text/javascript', '.js')
app = Flask(__name__)
app.config["SECRET_KEY"] = 'secret'
socketio = SocketIO(app)
socketio.init_app(app, cors_allowed_origins="*")

db.create_table()

@app.before_first_request
def serial_conn():
    thread = Thread(target=serial_start)
    thread.start()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def gui(path):
    return render_template("gui.html")

@socketio.on("request_list")
def handle_list():
    students = db.get_students()
    
    socketio.emit("reply_list", students)

in_st_id, in_st_name = "", ""
@socketio.on("request_enroll")
def handle_enroll(data):
    global branch, in_st_id, in_st_name

    if len(db.get_student(int(data["st_id"]))) > 0:
        return_data = {"type": "enroll", "state": "exist", "data": "이미 존재합니다"}

        socketio.emit("f_enroll_reply", return_data)
    else:
        branch = F_ENROLL

        in_st_id, in_st_name = data["st_id"], data["st_name"]

@socketio.on("request_delete")
def handle_delete(data):
    global branch, in_st_id
    branch = F_DELETE

    in_st_id = data["st_id"]


error_list = ["Imaging error",
              "Unknown error", "Image too messy", "Could not find fingerprint features"]
def serial_start():
    global branch, in_st_id, in_st_name
    port = "COM4"
    with open("serial.config", "r") as f:
        asdf = f.readline().strip()
        if asdf != "": port = asdf
    ser = serial.Serial(port, 250000)

    processing = False

    stop_flag = False
    while not stop_flag:
        if ser.in_waiting != 0:
            if ser.readable():
                data = ser.readline()
                data = data.decode('utf-8').strip()

                if data == "ok":
                    socketio.emit("error", {"type": "ready", "data": True})

                if data != "" and data != "No finger detected":
                    print(data)

                return_data = {"type": None, "state": None, "data": None}
                if data == "Communication error":
                    return_data["type"] = "error"
                    return_data["state"] = "communication"
                    return_data["data"] = "아두이노와 지문인식 센서의 연결을 확인하세요"

                    socketio.emit("error", return_data)
                elif data == "Error writing to flash":
                    return_data["type"] = "error"
                    return_data["state"] = "writetoflash"
                    return_data["data"] = "변경된 정보를 저장하는데에 실패하였습니다"

                    branch = F_CHECK
                    processing = False

                    socketio.emit("error", return_data)
                elif branch == F_CHECK:
                    if data == "Found a print match!":
                        data = ser.readline()
                        arduino_id = int(data.decode('utf-8').strip())
                        student = db.change_state(arduino_id)

                        return_data["type"] = "student"
                        return_data["state"] = True
                        return_data["data"] = student

                        socketio.emit("f_check_reply", return_data)
                        write(student)
                        handle_list()

                    elif data == "Did not find a match":
                        return_data["type"] = "student"
                        return_data["state"] = False

                        socketio.emit("f_check_reply", return_data)

                elif branch == F_DELETE:
                    if processing:
                        if data == "Please type in the ID # (from 1 to 255) you want to delete...":
                            arduino_id = db.get_arduino_id(in_st_id)

                            ser.write(str(arduino_id).encode('utf-8'))
                        elif data == "Deleted!":
                            return_data["type"] = "delete"
                            return_data["state"] = True
                            return_data["data"] = "삭제 완료"

                            db.delete_student(in_st_id)

                            in_st_id = ""

                            branch = F_CHECK
                            processing = False

                            socketio.emit("f_delete_reply", return_data)
                            handle_list()
                        else:
                            return_data["type"] = "delete"
                            return_data["state"] = False
                            return_data["data"] = "지문을 지우는데 실패했거나 알 수 없는 오류가 발생했습니다"

                            in_st_id = ""

                            branch = F_CHECK
                            processing = False

                            socketio.emit("f_delete_reply", return_data)
                    else:
                        ser.write(F_DELETE)
                        processing = True
                elif branch == F_ENROLL:
                    if processing:
                        if data == "Please type in the ID # (from 1 to 255) you want to save this finger as...":
                            empty_id = db.get_empty_arduino_id()
                            
                            ser.write(str(empty_id).encode('utf-8'))
                        elif "Waiting for valid finger to enroll as #" in data:
                            return_data["type"] = "enroll"
                            return_data["state"] = "step-1"
                            return_data["data"] = "지문을 인식해주세요"

                            socketio.emit("f_enroll_reply", return_data)
                        elif data == "Remove finger":
                            return_data["type"] = "enroll"
                            return_data["state"] = "step-r"
                            return_data["data"] = "손가락을 떼주세요"

                            socketio.emit("f_enroll_reply", return_data)
                        elif data == "Place same finger again":
                            return_data["type"] = "enroll"
                            return_data["state"] = "step-2"
                            return_data["data"] = "같은 지문을 다시한번 인식해주세요"

                            socketio.emit("f_enroll_reply", return_data)
                        elif data == "Stored!":
                            data = ser.readline()
                            data = int(data.decode('utf-8').strip())

                            db.add_student(in_st_id, in_st_name, data)
                            in_st_id, in_st_name = "", ""

                            return_data["type"] = "enroll-e"
                            return_data["state"] = "step-success"
                            return_data["data"] = "등록 완료"

                            branch = F_CHECK
                            processing = False

                            socketio.emit("f_enroll_reply", return_data)
                        elif data == "Fingerprints did not match":
                            return_data["type"] = "enroll-e"
                            return_data["state"] = "step-failed"
                            return_data["data"] = "지문이 일치하지 않습니다"

                            branch = F_CHECK
                            processing = False

                            socketio.emit("f_enroll_reply", return_data)
                        elif data in error_list:
                            return_data["type"] = "error"
                            return_data["state"] = "notfinger"
                            return_data["data"] = "지문을 인식하지 못했거나 지문이 아닙니다"

                            branch = F_CHECK
                            processing = False

                            socketio.emit("f_enroll_reply", return_data)
                    else:
                        ser.write(F_ENROLL)
                        processing = True


def write(student: dict):
    tz = pytz.timezone("Asia/Seoul")

    date = datetime.datetime.now(tz).strftime("%Y-%m-%d %H:%M")

    data = [date, student["st_id"], student["st_name"], "등교" if student["st_state"] == '1' else "하교"]

    with open('output.csv', 'a', encoding="utf-8", newline='') as csvfile:
        wr = csv.writer(csvfile)

        wr.writerow(data)

if __name__ == "__main__":
    socketio.run(app, port=5000)
