
import { classifyAssistantIntent } from '../ml/classifyAssistantIntent.js';

function normalizeLookup(value) {
    return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchedValues(question, sessions, field) {
    const normalizedQuestion = ` ${normalizeLookup(question)} `;
    const values = [...new Set(sessions.map((session) => session[field]).filter(Boolean))];
    return values.filter((value) => {
        const normalizedValue = normalizeLookup(value);
        return normalizedValue && normalizedQuestion.includes(` ${normalizedValue} `);
    });
}

export function generateAIResponse(question, sessions) {
    const q = question.trim().toLowerCase();

    if (!q) {
        return "Please enter a question.";
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const normalizedQuestion = ` ${normalizeLookup(q)} `;
    const selectedDay = days.find((day) => normalizedQuestion.includes(` ${day} `));
    const { intent } = classifyAssistantIntent(question);
    const subjects = matchedValues(question, sessions, 'subjectName');
    const rooms = matchedValues(question, sessions, 'room');
    const faculty = matchedValues(question, sessions, 'faculty');

    if (intent === 'subject' && subjects.length === 0 && !selectedDay) {
        return 'Which subject should I look up? Include its name or course code.';
    }
    if (intent === 'room' && rooms.length === 0 && !selectedDay) {
        return 'Which room should I look up? Include its name or number.';
    }
    if (intent === 'faculty' && faculty.length === 0 && !selectedDay) {
        return 'Which faculty member should I look up? Include their name.';
    }
    if (intent === 'unknown' && !selectedDay && !subjects.length && !rooms.length && !faculty.length) {
        return 'I can answer timetable questions. Ask about a day, subject, room, or faculty member.';
    }

    let filteredSessions = sessions;
    if (selectedDay) filteredSessions = filteredSessions.filter((session) => normalizeLookup(session.day) === selectedDay);
    if (subjects.length) filteredSessions = filteredSessions.filter((session) => subjects.includes(session.subjectName));
    if (rooms.length) filteredSessions = filteredSessions.filter((session) => rooms.includes(session.room));
    if (faculty.length) filteredSessions = filteredSessions.filter((session) => faculty.includes(session.faculty));

    if (filteredSessions.length === 0) {
        return "No classes found for your question.";
    }

    const answer = filteredSessions.map(session => {
        return `${session.subjectName} on ${session.day} at ${session.start}:00 in ${session.room} with ${session.faculty}`;
    });

    return answer.join("\n");
}
