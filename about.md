# Контекст проекта: HSE Deadlines (SmartLMS Monitor)

## 1. Стек технологий и архитектура
- **Платформа:** Мобильное гибридное приложение под Android на базе Capacitor (обёртка над WebView).
- **Frontend:** Модульный Vanilla JS + разделение по слоям (UI, API, парсер, хранилище, конфиг), Tailwind CSS, иконки FontAwesome 6, кастомный CSS. Без тяжелых JS-фреймворков.
- **Инструменты сборки:** VS Code (разработка интерфейса и логики), Android Studio (сборка APK/эмуляция), Gradle, Capacitor CLI.
- **Архитектура:** Полностью клиентское приложение (Client-side / Serverless / Local-first). Не требует отдельного бэкенда или внешней базы данных; все данные хранятся и обрабатываются локально на устройстве.

---

## 2. Структура проекта
```text
hse-app/
├── www/
│   ├── css/
│   │   └── style.css            # Кастомные стили и скроллбары
│   ├── js/
│   │   ├── config.js            # Базовый справочник дисциплин (DEFAULT_COURSES)
│   │   ├── storage.js           # Работа с localStorage
│   │   ├── parser.js            # iCal RFC 5545 парсер и расчет времени
│   │   ├── api.js               # Сетевой слой (CapacitorHttp / fetch)
│   │   └── app.js               # Жизненный цикл, UI-события, фильтрация
│   └── index.html               # Каркас интерфейса и подключение модулей
├── android/                     # Нативный проект Android Studio
│   ├── app/
│   │   ├── build.gradle         # Скрипт сборки, версии и авто-переименование APK
│   │   └── src/main/res/        # Адаптивные иконки и ресурсы Android
│   └── ...
├── capacitor.config.json        # Конфигурация Capacitor
├── package.json                 # Зависимости (@capacitor/core, @capacitor/android)
├── .gitignore                   # Исключены build/, .gradle/, node_modules/, *.apk
└── about.md                     # Описание архитектуры и структуры проекта
```