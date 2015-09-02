#!/bin/bash
set -e

echo -e " \n \n \n \n"

until [ "$(ping -c 1 us.archive.ubuntu.com | grep -c -E '0% packet loss')" = "1" ]; do
    echo "Waiting for the network to come up..."
    sleep 3
done

if ! command -v grunt >/dev/null
then
    apt-get update -y -qq >/dev/null

    # Install nodejs from Chris Lea's repo
    # http://stackoverflow.com/a/21715730
    apt-get purge nodejs npm -y -qq 2>&1 >/dev/null
    apt-get install python-software-properties -y -qq 2>&1 >/dev/null
    add-apt-repository ppa:chris-lea/node.js -y 2>&1 >/dev/null

    apt-get update -y -qq 2>&1 >/dev/null
    echo "Installing base dependencies using apt-get"
    apt-get install nodejs python-pip python-dev libpq-dev libevent-dev libfontconfig1 -y -qq 2>&1 >/dev/null

    echo -e "\nInstalling the Heroku Toolbelt"
    # Copied from https://toolbelt.heroku.com/install-ubuntu.sh
    echo "deb http://toolbelt.heroku.com/ubuntu ./" > /etc/apt/sources.list.d/heroku.list
    wget -O- https://toolbelt.heroku.com/apt/release.key 2>/dev/null | apt-key add - 2>&1 >/dev/null
    apt-get update -y -qq 2>&1 >/dev/null
    apt-get install heroku-toolbelt -y -qq >/dev/null

    echo -e "\nRunning npm install -g bower grunt-cli"
    npm install -g --silent bower grunt-cli 2>&1 >/dev/null
else
    echo "Initial provisioning already complete. Moving on..."
fi

# Change to the /vagrant directory, where the code is
cd /vagrant

echo -e "\nInstalling Linux version of packages..."
# Install karma-phantomjs-launcher ourselves, and redo bower install
rm -rf vendor/
su vagrant <<EOF
git checkout vendor
bower install --quiet
EOF

# Download phantomjs if necessary. This avoids an ETXTBSY error when the package
# installer has to download the file.
if [ ! -f /tmp/phantomjs/phantomjs-1.9.7-linux-i686.tar.bz2 ]; then
    echo "Downloading PhantomJS..."
    rm -rf /tmp/phantomjs
    mkdir -p /tmp/phantomjs
    chown vagrant:vagrant /tmp/phantomjs
    chmod -R 755 /tmp/phantomjs
    wget https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-1.9.7-linux-i686.tar.bz2 -O /tmp/phantomjs/phantomjs-1.9.7-linux-i686.tar.bz2 -q
    chown vagrant:vagrant /tmp/phantomjs/phantomjs-1.9.7-linux-i686.tar.bz2
fi

echo "Installing karma-phantomjs-launcher"
rm -rf node_modules/karma-phantomjs-launcher
su -c 'npm install --no-bin-links --silent karma-phantomjs-launcher@0.1.4' vagrant

# Fix Git notation in requirements.txt
sed -i -e 's/^-e /git+/' requirements.txt
# Fix Procfile
sed -i -e 's/^web: bin/# web: bin/' -e '$s/^#\s\+web/web/' Procfile

echo -e "\n \nRunning pip install -r requirements.txt -- this may take a few minutes"
pip install -r requirements.txt -q

rm -rf build

# Set up the app as the `vagrant` user, to avoid permissions problems later.
su vagrant <<EOF
set -e
cd /vagrant

echo -e "\nRunning 'python manage.py syncdb'"
export DJANGO_LOCAL_DEV=1
yes no | python manage.py syncdb 2>&1 >/dev/null

echo -e "\nDoing initial Grunt build"
grunt build --no-color | sed -e 's/\x1B\[[0-9;]*[JKmsu]//g'
EOF

# Set up foreman environment
cat > .env <<EOF
TESTING=1
DJANGO_DEBUG=1
DJANGO_LOCAL_DEV=1
EOF

echo -e "\n \n****************************\n \nDone! Login as vagrant (password: vagrant), cd /vagrant, run \`foreman start\`"
