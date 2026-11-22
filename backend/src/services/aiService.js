
import { classifyAssistantIntent } from '../ml/classifyAssistantIntent.js';

export function generateAIResponse(question, sessions) {
    const q = question.trim().toLowerCase();

    if (!q) {
        return "Please enter a question.";
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const selectedDay = days.find((day) => q.includes(day));
    const { intent } = classifyAssistantIntent(question);

    let filteredSessions = sessions;

    if (intent === 'day' && selectedDay) {
        filteredSessions = sessions.filter((session) => session.day.toLowerCase() === selectedDay);
    } else if (intent === 'subject') {
        const subject = sessions.find((session) => session.subjectName && q.includes(session.subjectName.toLowerCase()))?.subjectName;
        if (subject) filteredSessions = sessions.filter((session) => session.subjectName === subject);
    } else if (intent === 'room') {
        const room = sessions.find((session) => session.room && q.includes(session.room.toLowerCase()))?.room;
        if (room) filteredSessions = sessions.filter((session) => session.room === room);
    } else if (intent === 'faculty') {
        const faculty = sessions.find((session) => session.faculty && q.includes(session.faculty.toLowerCase()))?.faculty;
        if (faculty) filteredSessions = sessions.filter((session) => session.faculty === faculty);
    }

    if (filteredSessions.length === 0) {
        return "No classes found for your question.";
    }

    const answer = filteredSessions.map(session => {
        return `${session.subjectName} on ${session.day} at ${session.start}:00 in ${session.room} with ${session.faculty}`;
    });

    return answer.join("\n");
}
