let timer;
let timeLeft;
let isPaused = false;
let currentPage = 0;
const questionsPerPage = 10;
let allMCQs = [];
let testTopic = ""; // Store test topic

function startTest() {
    if (isPaused) {
        isPaused = false;
        timer = setInterval(updateTimer, 1000);
    } else {
        let selectedTime = document.getElementById("timerSelect").value;
        timeLeft = parseInt(selectedTime);
        document.getElementById("timer").textContent = formatTime(timeLeft);
        timer = setInterval(updateTimer, 1000);
    }
}

function pauseTest() {
    isPaused = true;
    clearInterval(timer);
}

function updateTimer() {
    if (!isPaused) {
        timeLeft--;
        let timerElement = document.getElementById("timer");
        timerElement.textContent = formatTime(timeLeft);

        if (timeLeft <= 60) {
            timerElement.classList.add("blink");
        }

        if (timeLeft <= 0) {
            clearInterval(timer);
            submitTest();
        }
    }
}

function formatTime(seconds) {
    let minutes = Math.floor(seconds / 60);
    let secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

function setTestTopic() {
    testTopic = document.getElementById("testTopic").value;
    document.getElementById("testTopicTitle").textContent = testTopic ? testTopic : "MCQ Test";
}

function extractText() {
    let fileInput = document.getElementById('fileInput').files[0];
    if (!fileInput) {
        alert("Please upload a PDF file.");
        return;
    }

    let fileReader = new FileReader();
    fileReader.onload = function () {
        let typedarray = new Uint8Array(this.result);

        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            let textPromises = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                textPromises.push(
                    pdf.getPage(i).then(page =>
                        page.getTextContent().then(textContent => {
                            let pageText = textContent.items
                                .map(item => item.str)
                                .join(" ")
                                .replace(/\s{2,}/g, ' ')
                                .replace(/- /g, '');

                            return `\n\n--- Page ${i} ---\n${pageText}`;
                        })
                    )
                );
            }

            Promise.all(textPromises).then(pagesText => {
                let fullText = pagesText.join("\n");
                allMCQs = extractMCQs(fullText);
                displayMCQs(currentPage);
            }).catch(err => {
                console.error("Text extraction error: ", err);
                alert("Failed to extract text.");
            });
        }).catch(err => {
            alert("Error loading PDF: " + err.message);
        });
    };

    fileReader.readAsArrayBuffer(fileInput);
}

function extractMCQs(text) {
    let questions = [];
    let regex = /(\d+)\.\s*(.*?)\s*\(a\)\s*(.*?)\s*\(b\)\s*(.*?)\s*\(c\)\s*(.*?)\s*\(d\)\s*(.*?)(?=\d+\.|\n\n|$)/gs;
    let match;

    let questionSet = new Set();

    while ((match = regex.exec(text)) !== null) {
        let questionText = match[2].trim();
        if (!questionSet.has(questionText)) {
            questionSet.add(questionText);
            questions.push({
                question: questionText,
                options: [
                    { label: "A", text: match[3].trim() },
                    { label: "B", text: match[4].trim() },
                    { label: "C", text: match[5].trim() },
                    { label: "D", text: match[6].trim() }
                ]
            });
        }
    }

    return questions;
}

function displayMCQs(page) {
    let outputDiv = document.getElementById("output");
    outputDiv.innerHTML = "";

    let start = page * questionsPerPage;
    let end = start + questionsPerPage;
    let pageQuestions = allMCQs.slice(start, end);

    pageQuestions.forEach((mcq, index) => {
        let questionElement = document.createElement("p");
        questionElement.classList.add("question");
        questionElement.textContent = `${start + index + 1}. ${mcq.question}`;

        let optionsList = document.createElement("div");
        mcq.options.forEach(option => {
            let optionElement = document.createElement("label");
            optionElement.classList.add("option");
            optionElement.innerHTML = `<input type="radio" name="q${start + index}" value="${option.label}"> ${option.label}. ${option.text}`;
            optionsList.appendChild(optionElement);
        });

        outputDiv.appendChild(questionElement);
        outputDiv.appendChild(optionsList);
    });

    document.getElementById("pageNumber").textContent = `Page ${page + 1}`;
    document.getElementById("prevBtn").disabled = page === 0;
    document.getElementById("nextBtn").disabled = end >= allMCQs.length;
}

function nextPage() {
    if (currentPage < Math.ceil(allMCQs.length / questionsPerPage) - 1) {
        currentPage++;
        displayMCQs(currentPage);
    }
}

function prevPage() {
    if (currentPage > 0) {
        currentPage--;
        displayMCQs(currentPage);
    }
}

function submitTest() {
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();

    let today = new Date();
    let formattedDate = today.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    doc.setFontSize(12);
    doc.text("MCQ Test Results", 10, 10);
    doc.text(`Test Topic: ${testTopic}`, 10, 20);
    doc.text(`Date: ${formattedDate}`, 10, 30); // ✅ Add Date to PDF
    doc.text(`Time Taken: ${formatTime(timeLeft)}`, 10, 40);

    let yOffset = 50;

    allMCQs.forEach((mcq, index) => {
        if (yOffset > 270) {
            doc.addPage();
            yOffset = 20;
        }

        let wrappedQuestion = doc.splitTextToSize(`${index + 1}. ${mcq.question}`, 180);
        doc.text(wrappedQuestion, 10, yOffset);
        yOffset += wrappedQuestion.length * 7;

        let selectedAnswer = document.querySelector(`input[name="q${index}"]:checked`);
        let selectedLabel = selectedAnswer ? selectedAnswer.value : null;

        mcq.options.forEach(option => {
            let isChecked = option.label === selectedLabel;

            if (isChecked) {
                doc.setFillColor(255, 255, 0);
                doc.rect(8, yOffset - 3, 190, 8, "F");
            }

            doc.text(`${option.label}. ${option.text}`, 12, yOffset);
            yOffset += 10;
        });

        yOffset += 5;
    });

    doc.save("Test_Results.pdf");
}

function displayCurrentDate() {
    let today = new Date();
    let formattedDate = today.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
    document.getElementById("currentDate").textContent = formattedDate;
}

// Call function when page loads
window.onload = function () {
    displayCurrentDate();
};