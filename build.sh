pip install -r requirements.txt
sudo apt install python3-venv
python3 -m venv mello
source mello/bin/activate
pip install wheel
pip install uwsgi flask
sudo ufw allow 5000