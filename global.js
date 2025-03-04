// Immediately-Invoked Function Expression to avoid global scope pollution
(function() {
    // Create slider container with label, slider input, and score display
    const sliderContainer = d3.select("body")
      .append("div")
      .attr("id", "slider-container");
  
    sliderContainer.append("label")
      .attr("for", "hrSlider")
      .text("Average Heart Rate:");
  
    sliderContainer.append("input")
      .attr("type", "range")
      .attr("id", "hrSlider");
  
    sliderContainer.append("span")
      .attr("id", "selectedScore");
  
    // Create slider value display container (to show current HR)
    d3.select("body")
      .append("div")
      .attr("id", "slider-value-display")
      .append("span")
      .attr("id", "currentHR");
  
    // Create chart container and SVG element
    const chartContainer = d3.select("body")
      .append("div")
      .attr("id", "chart-container");
  
    // Set dimensions and margins for the SVG
    const margin = { top: 40, right: 30, bottom: 40, left: 50 };
    const width = 700 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
  
    // Append SVG to the chart container
    const svg = chartContainer.append("svg")
      .attr("id", "lineChart")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Add plot title inside the SVG (centered above the chart area)
    svg.append("text")
      .attr("class", "plot-title")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .text("Heart Rate Trend of the Selected Student During Exam");
  
    // Define the student objects with CSV column ids and their scores
    let students = [
      { id: "s1_final_HR",  grade: 182 },
      { id: "s2_final_HR",  grade: 180 },
      { id: "s3_final_HR",  grade: 188 },
      { id: "s4_final_HR",  grade: 149 },
      { id: "s5_final_HR",  grade: 157 },
      { id: "s6_final_HR",  grade: 175 },
      { id: "s7_final_HR",  grade: 110 },
      { id: "s8_final_HR",  grade: 184 },
      { id: "s9_final_HR",  grade: 126 },
      { id: "s10_final_HR", grade: 116 }
    ];
  
    // Load the CSV data
    d3.csv("a-wearable-exam-stress-dataset-for-predicting-cognitive-performance-in-real-world-settings-1.0.0/CleanData/HR/HRfinal.csv").then(data => {
      // Parse numeric values
      data.forEach(d => {
        d.minute = +d.minute;
        students.forEach(s => {
          d[s.id] = +d[s.id];
        });
      });
  
      // For each student, compute their average HR and store the time series
      students.forEach(s => {
        const timeSeries = data.map(row => ({
          minute: row.minute,
          hr: row[s.id]
        }));
        s.timeSeries = timeSeries;
        s.avgHR = d3.mean(timeSeries, d => d.hr);
      });
  
      // Determine the global min and max of the average HRs for slider range
      const minHR = d3.min(students, d => d.avgHR);
      const maxHR = d3.max(students, d => d.avgHR);
  
      // Set slider attributes based on computed values
      const slider = document.getElementById("hrSlider");
      slider.min = Math.floor(minHR);
      slider.max = Math.ceil(maxHR);
      slider.value = Math.round((minHR + maxHR) / 2);
  
      const currentHRDisplay = document.getElementById("currentHR");
  
      // Create scales for the line chart
      const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.minute))
        .range([0, width]);
  
      const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => {
          const vals = students.map(s => d[s.id]);
          return d3.max(vals);
        })])
        .nice()
        .range([height, 0]);
  
      // Create axes
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale);
  
      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);
  
      svg.append("g")
        .call(yAxis);
  
      // Add axis labels to the SVG
      svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5)
        .text("Minute");
  
      svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${-margin.left + 15}, ${height/2}) rotate(-90)`)
        .text("Heart Rate (bpm)");
  
      // Define the line generator for the heart rate trend
      const line = d3.line()
        .x(d => xScale(d.minute))
        .y(d => yScale(d.hr));
  
      // Function to update the line chart based on the selected student's data
      function updateChart(student) {
        // Remove any existing line path
        svg.selectAll(".line-path").remove();
  
        // Draw the new line path
        svg.append("path")
          .datum(student.timeSeries)
          .attr("class", "line-path")
          .attr("fill", "none")
          .attr("stroke", "steelblue")
          .attr("stroke-width", 2)
          .attr("d", line);
      }
  
      // Function to find the student whose average HR is closest to the slider value
      function findClosestStudent(value) {
        let closest = students[0];
        let minDiff = Math.abs(students[0].avgHR - value);
        for (let i = 1; i < students.length; i++) {
          const diff = Math.abs(students[i].avgHR - value);
          if (diff < minDiff) {
            minDiff = diff;
            closest = students[i];
          }
        }
        return closest;
      }
  
      // Get the score display element
      const scoreDisplay = document.getElementById("selectedScore");
  
      // Slider event listener for dynamic updates
      slider.addEventListener("input", function() {
        const sliderValue = +this.value;
        
        // Update the display of the current slider value (heart rate)
        currentHRDisplay.textContent = "Selected HR: " + sliderValue;
        
        // Find the student with the closest average HR to the slider value
        const closestStudent = findClosestStudent(sliderValue);
  
        // Update the displayed score (grade) for that student
        scoreDisplay.textContent = " Score of the student with the closest average HR to the selected HR: " + closestStudent.grade;
  
        // Update the line chart to show the student's heart rate trend
        updateChart(closestStudent);
      });
  
      // Initialize the visualization with the slider's initial value
      const initValue = +slider.value;
      currentHRDisplay.textContent = "Selected HR: " + initValue;
      const initStudent = findClosestStudent(initValue);
      scoreDisplay.textContent = " Score of the student with the closest average HR to the selected HR: " + initStudent.grade;
      updateChart(initStudent);
    });
  })();
  