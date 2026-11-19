
export function generateAIResponse(question, sessions) {
    const q = question.trim().toLowerCase();

    if (!q) {
        return "Please enter a question.";
    }

    const days = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday"
    ];

    const selectedDay = days.find(day => q.includes(day));

    let filteredSessions = sessions;

    if (selectedDay) {
        filteredSessions = sessions.filter(
            session => session.day.toLowerCase() === selectedDay
        );
    }

    if (filteredSessions.length === 0) {
        return "No classes found for your question.";
    }

    const answer = filteredSessions.map(session => {
        return `${session.subjectName} on ${session.day} at ${session.start}:00 in ${session.room} with ${session.faculty}`;
    });

    return answer.join("\n");
}
