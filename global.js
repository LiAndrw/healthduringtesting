// Immediately-Invoked Function Expression to avoid polluting the global scope
(function() {
  // Define features, exam sessions, and student IDs
  const features = ["HR", "EDA", "BVP", "TEMP", "STRESS"];
  const exams = ["midterm 1", "midterm 2", "final"];
  const students = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];

  // Define exam grades for each session
  const grades = {
    "midterm 1": {
      "s1": 78,  "s2": 82,  "s3": 77,  "s4": 75,  "s5": 67,
      "s6": 71,  "s7": 64,  "s8": 92,  "s9": 80,  "s10": 89
    },
    "midterm 2": {
      "s1": 82,  "s2": 85,  "s3": 90,  "s4": 77,  "s5": 77,
      "s6": 64,  "s7": 33,  "s8": 88,  "s9": 39,  "s10": 64
    },
    "final": {
      "s1": 91,  "s2": 90,  "s3": 94,  "s4": 75,  "s5": 79,
      "s6": 88,  "s7": 55,  "s8": 92,  "s9": 63,  "s10": 58
    }
  };

  // Define exam durations (in minutes)
  const examDurations = {
    "midterm 1": 90,
    "midterm 2": 90,
    "final": 180
  };

  // Base path to the CSV files
  const basePath = "a-wearable-exam-stress-dataset-for-predicting-cognitive-performance-in-real-world-settings-1.0.0/CleanData/";

  // Helper: build file path given a feature and exam session
  function getFilePath(feature, exam) {
    // For finals, the file name is like "HRfinal.csv"; for midterms, include the exam label (e.g., "midterm 1")
    if (exam === "final") {
      return `${basePath}${feature}/${feature}final.csv`;
    } else {
      return `${basePath}${feature}/${feature}${exam}.csv`;
    }
  }

  // Object to hold CSV data for each feature & exam session
  let dataByFeatureExam = {};
  features.forEach(feature => {
    dataByFeatureExam[feature] = {};
  });

  // Build an array of CSV loading promises (15 files total)
  let csvPromises = [];
  features.forEach(feature => {
    exams.forEach(exam => {
      const filePath = getFilePath(feature, exam);
      //console.log(filePath);
      const promise = d3.csv(filePath).then(data => {
        // Convert the "minute" field and each student column to numbers.
        data.forEach(d => {
          d.minute = +d.minute;
          students.forEach(student => {
            let colName;
            if (feature === "STRESS") {
              // For STRESS, the columns are named like "s1_stress"
              colName = `${student}_stress`;
            } else {
              // For other features, the column names include the exam label
              // e.g., "s1_midterm 1_HR" or "s1_final_HR"
              let examLabel = exam === "final" ? "final" : exam;
              colName = `${student}_${examLabel}_${feature}`;
            }
            if (d[colName] !== undefined) {
              d[colName] = +d[colName];
              // Multiply EDA values by 100
              if (feature === "EDA") {
                d[colName] = d[colName] * 100;
              }
              if (feature === "BVP") {
                d[colName] = d[colName] * 5;
              }
              if (feature === "TEMP") {
                d[colName] = d[colName] * 5;
              }
            }
          });
        });
        dataByFeatureExam[feature][exam] = data;
      });
      csvPromises.push(promise);
    });
  });

  // After all CSV files are loaded…
  Promise.all(csvPromises).then(() => {
    // Build an array of exam session objects (30 sessions: 10 students × 3 exams)
    let examSessions = [];
    exams.forEach(exam => {
      students.forEach(student => {
        let session = {
          student: student,
          exam: exam,
          grade: grades[exam][student],
          timeSeries: {},  // to store time series for each feature
          avg: {}          // to store average values for each feature
        };

        features.forEach(feature => {
          let csvData = dataByFeatureExam[feature][exam];
          let colName;
          if (feature === "STRESS") {
            colName = `${student}_stress`;
          } else {
            let examLabel = exam === "final" ? "final" : exam;
            colName = `${student}_${examLabel}_${feature}`;
          }
          // Build the time series for this feature in the session
          let series = csvData.map(d => ({
            minute: d.minute,
            value: d[colName]
          }));
          session.timeSeries[feature] = series;
          // Compute the average value for this feature
          session.avg[feature] = d3.mean(series, d => d.value);
        });
        examSessions.push(session);
      });
    });

    // Determine slider ranges for each feature from the computed session averages
    let sliderRanges = {};
    features.forEach(feature => {
      const minVal = d3.min(examSessions, d => d.avg[feature]);
      const maxVal = d3.max(examSessions, d => d.avg[feature]);
      sliderRanges[feature] = { min: Math.floor(minVal), max: Math.ceil(maxVal) };
    });

    // --- Build the Dashboard UI ---

    // Select the dashboard container (in index.html)
    const dashboard = d3.select("#dashboard");

    // Create a container for the sliders
    const slidersContainer = dashboard.append("div").attr("id", "sliders-container");

    // For each feature, create a slider with a label and a value display
    features.forEach(feature => {
      let sliderGroup = slidersContainer.append("div").attr("class", "slider-group");
      
      sliderGroup.append("label")
        .attr("for", `${feature}Slider`)
        .text(`Average ${feature}: `);
      let slider = sliderGroup.append("input")
        .attr("type", "range")
        .attr("id", `${feature}Slider`)
        .attr("min", sliderRanges[feature].min)
        .attr("max", sliderRanges[feature].max)
        .attr("value", Math.round((sliderRanges[feature].min + sliderRanges[feature].max) / 2));
      console.log(`Created slider for ${feature}:`, slider.node());
      sliderGroup.append("span")
        .attr("id", `${feature}ValueDisplay`)
        .text(Math.round((sliderRanges[feature].min + sliderRanges[feature].max) / 2));
      //console.log(`Created slider for ${feature}:`, document.getElementById(`${feature}Slider`));
    });

    // Create a display area for the selected grade and exam session
    const gradeDisplay = dashboard.append("div").attr("id", "grade-display");

    // Create the chart container
    const chartContainer = dashboard.append("div").attr("id", "chart-container");

    // Set dimensions and margins for the SVG chart
    const margin = { top: 40, right: 30, bottom: 40, left: 50 };
    const width = 700 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Append the SVG element for the line chart
    const svg = chartContainer.append("svg")
      .attr("id", "lineChart")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add a plot title
    svg.append("text")
      .attr("class", "plot-title")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .text("Physiological Trends and Grade for Selected Exam Session");

    // Create groups for the x and y axes (to be updated on chart redraw)
    const xAxisGroup = svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height})`);
    const yAxisGroup = svg.append("g")
      .attr("class", "y-axis");
    // Append a legend group to the SVG (position it as needed)
const legend = svg.append("g")
.attr("class", "legend")
.attr("transform", `translate(${width - 120}, 10)`); // Adjust position

// Create a legend entry for each feature
features.forEach((feature, i) => {
const legendRow = legend.append("g")
  .attr("transform", `translate(0, ${i * 20})`);

// Add a colored rectangle (or you could use a line)
legendRow.append("rect")
  .attr("width", 15)
  .attr("height", 15)
  .attr("fill", getStrokeColor(feature));

// Add text next to the rectangle
let feature_multiplied = feature;
if(feature=='EDA'){
  feature_multiplied=feature_multiplied+'*100';
}
if(feature=='BVP'){
  feature_multiplied=feature_multiplied+'*5';
}
if(feature=='TEMP'){
  feature_multiplied=feature_multiplied+'*5';
}

legendRow.append("text")
  .attr("x", 20)
  .attr("y", 12)
  .attr("text-anchor", "start")
  .style("font-size", "12px")
  .text(feature_multiplied);
});

    // Create scales (will be updated based on the selected session)
    let xScale = d3.scaleLinear().range([0, width]);
    let yScale = d3.scaleLinear().range([height, 0]);

    // Helper: assign a distinct stroke color for each feature line
    function getStrokeColor(feature) {
      const colors = {
        "HR": "steelblue",
        "EDA": "orange",
        "BVP": "green",
        "TEMP": "purple",
        "STRESS": "red"
      };
      return colors[feature] || "black";
    }

    // Update the multi-line chart based on the selected exam session
    function updateChart(session) {
      // Set x-axis based on exam duration (90 minutes for midterms, 180 for final)
      xScale.domain([0, examDurations[session.exam]]);

      // Determine the y-axis domain by combining values from all features for this session
      let allValues = [];
      features.forEach(feature => {
        allValues = allValues.concat(session.timeSeries[feature].map(d => d.value));
      });
      yScale.domain(d3.extent(allValues)).nice();

      // Update axes with transitions
      xAxisGroup.transition().call(d3.axisBottom(xScale));
      yAxisGroup.transition().call(d3.axisLeft(yScale));

      // Remove any existing line paths
      svg.selectAll(".line-path").remove();

      // Draw one line per feature using its respective time series data
      features.forEach(feature => {
        let lineGen = d3.line()
          .x(d => xScale(d.minute))
          .y(d => yScale(d.value));
        svg.append("path")
          .datum(session.timeSeries[feature])
          .attr("class", "line-path")
          .attr("fill", "none")
          .attr("stroke", getStrokeColor(feature))
          .attr("stroke-width", 2)
          .attr("d", lineGen);
      });
    }

    // Retrieve the target vector from all slider values
    // Update the text display next to each slider as its value changes
function updateSliderDisplays() {
  features.forEach(feature => {
    const slider = document.getElementById(`${feature}Slider`);
    const display = document.getElementById(`${feature}ValueDisplay`);
    if (slider && display) {
      display.textContent = slider.value;
    } else {
      console.error(`Missing slider or display element for feature: ${feature}`);
    }
  });
}

// Retrieve the target vector from all slider values
// Build target vector based on which slider is active.
// If activeFeature is "STRESS", only use STRESS; otherwise, use all features except STRESS.
function getTargetVector(activeFeature) {
  let target = {};
  if (activeFeature === "STRESS") {
    target["STRESS"] = +document.getElementById("STRESSSlider").value;
  } else {
    features.forEach(feature => {
      if (feature !== "STRESS") {
        const slider = document.getElementById(`${feature}Slider`);
        target[feature] = +slider.value;
      }
    });
  }
  return target;
}



    // Compute the Euclidean distance between a session's averages and the target vector
    // Compute Euclidean distance only over the features present in target
function computeDistance(session, target) {
  let sumSq = 0;
  for (const key in target) {
    const diff = session.avg[key] - target[key];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}


    // Find the exam session whose average feature vector is closest to the target vector
    function findClosestSession(target) {
      let bestSession = examSessions[0];
      let minDistance = computeDistance(bestSession, target);
      examSessions.forEach(session => {
        const dist = computeDistance(session, target);
        if (dist < minDistance) {
          minDistance = dist;
          bestSession = session;
        }
      });
      return bestSession;
    }

    // Attach event listeners to all sliders so that any change updates the display and chart
    d3.selectAll("input[type=range]").on("input", function() {
      updateSliderDisplays();
      // If the dragged slider is STRESS, use only STRESS; otherwise, ignore STRESS.
      let activeFeature = (this.id === "STRESSSlider") ? "STRESS" : null;
      const target = getTargetVector(activeFeature);
      const closestSession = findClosestSession(target);
      gradeDisplay.text(`Selected Exam: ${closestSession.exam.toUpperCase()} - Student: ${closestSession.student.toUpperCase()} - Grade: ${closestSession.grade}`);
      updateChart(closestSession);
    });
    

    // Initialize the dashboard using the sliders’ initial values
    updateSliderDisplays();
    const initialTarget = getTargetVector();
    const initialSession = findClosestSession(initialTarget);
    gradeDisplay.text(`Selected Exam: ${initialSession.exam.toUpperCase()} - Student: ${initialSession.student.toUpperCase()} - Grade: ${initialSession.grade}`);
    updateChart(initialSession);
  });
})();


document.addEventListener("DOMContentLoaded", function() {
  const hookLines = document.querySelectorAll(".hook-text");
  let currentIndex = 0;

  document.getElementById("hook-container").addEventListener("click", function() {
      if (currentIndex < hookLines.length - 1) {
          currentIndex++;
          hookLines[currentIndex].classList.remove("hidden");
          hookLines[currentIndex].style.opacity = 1;
      }
  });
});