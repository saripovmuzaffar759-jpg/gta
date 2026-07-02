let authBrowser = null;

mp.events.add('showRegister', () => {
    if (authBrowser) return;
    authBrowser = mp.browsers.new('package://auth/register.html');
    mp.gui.cursor.show(true, true);
});

mp.events.add('showLogin', (username) => {
    if (authBrowser) return;
    authBrowser = mp.browsers.new('package://auth/login.html');
    authBrowser.execute(`setUsername('${username}')`);
    mp.gui.cursor.show(true, true);
});

mp.events.add('closeAuthUI', () => {
    if (authBrowser) {
        authBrowser.destroy();
        authBrowser = null;
    }
    mp.gui.cursor.show(false, false);
});

// Прокидываем события из браузера в сервер
mp.events.add('registerAccount', (username, password) => {
    mp.events.callRemote('playerRegister', username, password);
});
mp.events.add('loginAccount', (username, password) => {
    mp.events.callRemote('playerLogin', username, password);
});

// Результаты от сервера
mp.events.add('registrationResult', (success, message) => {
    if (authBrowser) authBrowser.execute(`result(${success}, '${message}')`);
});
mp.events.add('loginResult', (success, message) => {
    if (authBrowser) authBrowser.execute(`result(${success}, '${message}')`);
});
