const fs = require('fs');
const Datastore = require('nedb');

// Инициализация базы данных (файл будет создан автоматически)
const db = new Datastore({ filename: 'data/accounts.db', autoload: true });

// Событие: игрок подключился
mp.events.add('playerJoin', (player) => {
    console.log(`${player.name} подключился.`);
    // Ищем аккаунт по socialClub (уникальный идентификатор)
    db.findOne({ social: player.socialClub }, (err, doc) => {
        if (!doc) {
            // Новый игрок – просим зарегистрироваться через клиентское событие
            player.call('showRegister', []);
        } else {
            // Существующий – просим авторизоваться
            player.call('showLogin', [doc.username]);
        }
    });
});

// Регистрация (клиент отправляет никнейм и пароль)
mp.events.add('playerRegister', (player, username, password) => {
    // Проверка на существование
    db.findOne({ username: username }, (err, existing) => {
        if (existing) {
            player.call('registrationResult', [false, 'Ник занят!']);
            return;
        }
        // Сохраняем
        const newAccount = {
            social: player.socialClub,
            username: username,
            password: password, // В реальном проекте нужно хешировать!
            money: 5000,
            skin: 'mp_m_freemode_01',
            position: { x: -425, y: 1123, z: 325 },
            dimension: 0
        };
        db.insert(newAccount, (err, doc) => {
            player.call('registrationResult', [true, doc.username]);
            spawnPlayer(player, doc);
        });
    });
});

// Логин (клиент отправляет ник и пароль)
mp.events.add('playerLogin', (player, username, password) => {
    db.findOne({ username: username, password: password }, (err, doc) => {
        if (!doc) {
            player.call('loginResult', [false, 'Неверный логин или пароль.']);
            return;
        }
        player.call('loginResult', [true, doc.username]);
        spawnPlayer(player, doc);
    });
});

function spawnPlayer(player, data) {
    player.data = data; // сохраняем данные игрока в объекте
    player.money = data.money;
    player.model = mp.joaat(data.skin);
    player.position = new mp.Vector3(data.position.x, data.position.y, data.position.z);
    player.dimension = data.dimension;
    player.call('closeAuthUI');
    setTimeout(() => {
        player.outputChatBox(`!{#00ff00} Добро пожаловать, ${data.username}! У тебя $${data.money}`);
    }, 1000);
}

// Сохранение аккаунта при выходе
mp.events.add('playerQuit', (player) => {
    if (player.data) {
        db.update({ social: player.socialClub }, {
            $set: {
                money: player.money || player.data.money,
                position: { x: player.position.x, y: player.position.y, z: player.position.z },
                dimension: player.dimension,
                skin: player.model ? mp.vehicleModels[player.model] : 'mp_m_freemode_01'
            }
        });
        console.log(`${player.data.username} вышел, данные сохранены.`);
    }
});

// Команда: деньги
mp.events.addCommand('money', (player) => {
    player.outputChatBox(`💰 Деньги: $${player.money || 0}`);
});

// Команда: /car [модель] – спавнит машину
mp.events.addCommand('car', (player, fullText, model) => {
    if (!model) {
        player.outputChatBox('Использование: /car <модель> (например: /car infernus)');
        return;
    }
    const vehicleModel = mp.joaat(model);
    if (!mp.vehicles.exists(vehicleModel)) {
        player.outputChatBox('Неверная модель машины!');
        return;
    }
    const pos = player.position;
    const veh = mp.vehicles.new(vehicleModel, new mp.Vector3(pos.x + 2, pos.y, pos.z));
    player.putIntoVehicle(veh, -1);
    player.outputChatBox(`🚗 Вы сели в ${model.toUpperCase()}`);
});

// Команда: /weapon [название]
mp.events.addCommand('weapon', (player, fullText, weaponName) => {
    if (!weaponName) {
        player.outputChatBox('Использование: /weapon <название> (например: /weapon pistol)');
        return;
    }
    player.giveWeapon(mp.joaat(`weapon_${weaponName}`), 500);
    player.outputChatBox(`🔫 Вы получили ${weaponName}`);
});

// Команда: /heal
mp.events.addCommand('heal', (player) => {
    player.health = 100;
    player.armour = 100;
    player.outputChatBox('❤️ Здоровье и броня восстановлены!');
});

// Команда: /tp x y z
mp.events.addCommand('tp', (player, fullText, x, y, z) => {
    if (!x || !y || !z) {
        player.outputChatBox('Использование: /tp <x> <y> <z>');
        return;
    }
    player.position = new mp.Vector3(parseFloat(x), parseFloat(y), parseFloat(z));
    player.outputChatBox(`📍 Телепорт: ${x}, ${y}, ${z}`);
});

// Команда: /interior [id] – примеры интерьеров из GTA V
const interiors = {
    'appart1': { x: -786.866, y: 315.764, z: 217.638 },
    'appart2': { x: -774.025, y: 342.042, z: 196.686 },
    'office': { x: -1410.473, y: -283.404, z: 46.5 }
};

mp.events.addCommand('interior', (player, fullText, id) => {
    if (!id || !interiors[id]) {
        player.outputChatBox('Доступные интерьеры: ' + Object.keys(interiors).join(', '));
        return;
    }
    const loc = interiors[id];
    player.position = new mp.Vector3(loc.x, loc.y, loc.z);
    player.dimension = player.id + 100; // чтобы разные игроки не видели друг друга внутри
    player.outputChatBox(`🏠 Вы вошли в интерьер "${id}"`);
});

// Команда: /out – выход из интерьера
mp.events.addCommand('out', (player) => {
    player.dimension = 0;
    player.position = new mp.Vector3(-425, 1123, 325);
    player.outputChatBox('Вы вышли на улицу.');
});
