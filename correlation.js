document.addEventListener("DOMContentLoaded", function () {
  const basePath = "a-wearable-exam-stress-dataset-for-predicting-cognitive-performance-in-real-world-settings-1.0.0/CleanData/";
  const students = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];
  const exams = ["midterm_1", "midterm_2", "final"];
  const features = ["stress", "hr", "bvp", "temp", "eda"];

  let selectedExam = "midterm_1";
  let selectedFeature = "stress";
  let selectedStudents = new Set(students); // Track selected students

  // Mapping of features to their Y-axis labels
  const featureLabels = {
    "stress": "Stress Level (0-100%)",
    "hr": "Heart Rate (BPM)",
    "bvp": "Blood Volume Pulse",
    "temp": "Skin Surface Temperature (°C)",
    "eda": "Electrodermal Activity (μS)"
  };

  // Helper function to get the correct file path
  function getFilePath(exam, feature) {
    const featureUpper = feature.toUpperCase();
    let fileName;
    if (exam === "final") {
      fileName = `${featureUpper}final.csv`;
    } else {
      // Replace spaces with %20 for URL encoding
      fileName = `${featureUpper}${exam.replace(/_/g, "%20")}.csv`;
    }
    return `${basePath}${featureUpper}/${fileName}`;
  }

  // Helper function to get the correct column name for a student
  function getStudentColumn(student, exam, feature) {
    if (feature === "stress") {
      return `${student}_stress`; // For stress files
    } else {
      // For other features, capitalize the feature name and handle spaces in exam names
      const featureUpper = feature.toUpperCase();
      const examfixed = exam.replace(/_/g," ");
      return `${student}_${examfixed}_${featureUpper}`;
    }
  }

  // Load CSV data
  function loadData(exam, feature) {
    const filePath = getFilePath(exam, feature);
    console.log(`Loading data from: ${filePath}`); // Debugging
    return d3.csv(filePath).then(data => {
      console.log(`Loaded data for ${exam} - ${feature}:`, data); // Debugging
      // Convert minute and student-specific columns to numbers
      data.forEach(d => {
        d.minute = +d.minute;
        students.forEach(student => {
          const colName = getStudentColumn(student, exam, feature);
          console.log(`Column name for ${student}:`, colName); // Debugging
          d[colName] = +d[colName];
        });
      });
      return data;
    }).catch(error => {
      console.error(`Error loading data for ${exam} - ${feature}:`, error); // Debugging
      return [];
    });
  }

  // Set up the SVG canvas
  const margin = { top: 50, right: 100, bottom: 60, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#line-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const xScale = d3.scaleLinear().range([0, width]);
  const yScale = d3.scaleLinear().range([height, 0]);

  // Axes
  const xAxisGroup = svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

  const yAxisGroup = svg.append("g")
    .attr("class", "y-axis");

  // Add X-axis label
  const xAxisLabel = svg.append("text")
    .attr("class", "x-axis-label")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px");

  // Add Y-axis label
  const yAxisLabel = svg.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .style("font-size", "14px");

  // Function to update axis labels
  function updateAxisLabels() {
    xAxisLabel.text(`Test Progress (Minutes)`);
    yAxisLabel.text(featureLabels[selectedFeature]);
  }

  // Function to update the line chart
  function updateLineChart(data) {
    console.log(`Updating chart for ${selectedExam} - ${selectedFeature}:`, data); // Debugging

    // Update scales
    const xDomain = [0, d3.max(data, d => d.minute)];
    const yDomain = selectedFeature === "bvp" ? 
      [d3.min(data, d => d3.min(students, student => d[getStudentColumn(student, selectedExam, selectedFeature)])), 
       d3.max(data, d => d3.max(students, student => d[getStudentColumn(student, selectedExam, selectedFeature)]))] :
      [0, d3.max(data, d => d3.max(students, student => d[getStudentColumn(student, selectedExam, selectedFeature)]))];
    console.log(`xDomain:`, xDomain, `yDomain:`, yDomain); // Debugging

    xScale.domain(xDomain);
    yScale.domain(yDomain);

    // Update axes
    xAxisGroup.transition().call(d3.axisBottom(xScale));
    yAxisGroup.transition().call(d3.axisLeft(yScale));

    // Draw lines for each selected student
    students.forEach(student => {
      const colName = getStudentColumn(student, selectedExam, selectedFeature);
      const lineData = data.map(d => ({
        minute: d.minute,
        value: d[colName]
      }));
      console.log(`Line data for ${student}:`, lineData); // Debugging

      const line = d3.line()
        .x(d => xScale(d.minute))
        .y(d => yScale(d.value));

      svg.selectAll(`.line-${student}`)
        .data([lineData])
        .join("path")
        .attr("class", `line-${student}`)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", d3.schemeCategory10[students.indexOf(student)])
        .attr("stroke-width", 2)
        .style("visibility", selectedStudents.has(student) ? "visible" : "hidden"); // Show/hide based on selection
    });

    // Update or create the legend
    updateLegend();
    updateAxisLabels();
  }

  // Function to create or update the legend
  function updateLegend() {
    // Select all legend groups and bind the students array
    const legend = svg.selectAll(".legend")
      .data(students, d => d); // Use the student ID as the key for data binding

    // Remove unused legend groups
    legend.exit().remove();

    // Add new legend groups
    const legendEnter = legend.enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${width + 20}, ${i * 20})`); // Position legend on the right

    // Add colored circles for each student
    legendEnter.append("circle")
      .attr("class", "legend-circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 5)
      .attr("fill", (d, i) => d3.schemeCategory10[i]);

    // Add student labels
    legendEnter.append("text")
      .attr("class", "legend-label")
      .attr("x", 10)
      .attr("y", 5)
      .text((d, i) => `Student ${i + 1}`)
      .style("font-size", "12px")
      .style("fill", "#333");

    // Merge enter and update selections for future updates
    legend.merge(legendEnter);
  }

  // Event listeners for radio buttons
  d3.selectAll("#line-chart-exam-selector input").on("change", function () {
    selectedExam = this.value;
    loadData(selectedExam, selectedFeature).then(updateLineChart);
  });

  d3.selectAll("#line-chart-variable-selector input").on("change", function () {
    selectedFeature = this.value;
    loadData(selectedExam, selectedFeature).then(updateLineChart);
  });

  // Event listeners for student checkboxes
  d3.selectAll("#student-selector input").on("change", function () {
    const student = this.value;
    if (this.checked) {
      selectedStudents.add(student); // Add student to selection
    } else {
      selectedStudents.delete(student); // Remove student from selection
    }
    loadData(selectedExam, selectedFeature).then(updateLineChart);
  });

  // Initial load
  loadData(selectedExam, selectedFeature).then(updateLineChart);
});
