import { interval, of, startWith } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import { catchError, map, switchMap } from 'rxjs/operators';
import './styles.css';

const API_URL = '/messages/unread';
const POLL_INTERVAL = 5000; // 5 секунд

const addedMessageIds = new Set();

// Функция для форматирования даты из timestamp в ЧЧ:ММ ДД.ММ.ГГГГ
function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${hours}:${minutes} ${day}.${month}.${year}`;
}

// Функция для сокращения subject до 15 символов
function truncateSubject(subject) {
  if (subject.length <= 15) {
    return subject;
  }
  return `${subject.substring(0, 15)}...`;
}

// Функция для добавления сообщения в таблицу
function addMessageToTable(message) {
  // Проверяем, не было ли это сообщение уже добавлено
  if (addedMessageIds.has(message.id)) {
    return;
  }
  
  const tbody = document.querySelector('#messages-table tbody');
  if (!tbody) {
    // eslint-disable-next-line no-console
    console.error('Таблица в body не найдена');
    return;
  }
  
  const row = document.createElement('tr');
  
  row.innerHTML = `
    <td>${message.from}</td>
    <td>${truncateSubject(message.subject)}</td>
    <td>${formatDate(message.received)}</td>
  `;
  
  // Добавляем строку в начало таблицы
  tbody.insertBefore(row, tbody.firstChild);
  
  // Отмечаем сообщение как добавленное
  addedMessageIds.add(message.id);
}

// Создаём поток, который опрашивает сервер каждые 5 секунд
// startWith(0) делает первый запрос сразу при подписке
const messages$ = interval(POLL_INTERVAL).pipe(
  startWith(0), // Делаем первый запрос сразу
  switchMap(() =>
    ajax.getJSON(API_URL).pipe(
      map((response) => {
        if (response.status === 'ok' && response.messages) {
          return response.messages
        }
        return [];
      }),
      catchError((error) => {
        // При ошибке возвращаем пустой массив.
        // eslint-disable-next-line no-console
        console.error('Ошибка при отправки сообщения:', error);
        return of([]);
      })
    )
  )
);

// Инициализация и подписка на обновления
document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.querySelector('#messages-table tbody');
  if (!tbody) {
    // eslint-disable-next-line no-console
    console.error('Таблица в body не найдена');
    return;
  }
  
  // Подписываемся на обновления
  messages$.subscribe((messages) => {
    // Добавляем только новые сообщения в таблицу
    messages.forEach((message) => {
      addMessageToTable(message);
    });
  });
});
