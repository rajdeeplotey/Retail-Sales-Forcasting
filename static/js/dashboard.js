// ============================================
// RetailIQ - Dashboard JavaScript
// Interactive Functionality
// ============================================

// Global chart instances
let monthlySalesChart, categoryChart, productChart, regionChart, distributionChart, growthChart;
let dataTable;

// Initialize dashboard when DOM is loaded
$(document).ready(function() {
    initializeDashboard();
});

// Main initialization function
function initializeDashboard() {
    loadDropdownData();
    loadAnalyticsData();
    initializeEventListeners();
    initializeSidebar();
    setDefaultDate();
}

// Load dropdown options from backend
function loadDropdownData() {
    $.get('/dropdown-data', function(data) {
        populateDropdown('product', data.products);
        populateDropdown('category', data.categories);
        populateDropdown('region', data.regions);
    }).fail(function(error) {
        console.error('Error loading dropdown data:', error);
    });
}

// Populate dropdown with options
function populateDropdown(elementId, options) {
    const select = $('#' + elementId);
    select.empty();
    select.append('<option value="">Select ' + elementId.replace(/([A-Z])/g, ' $1').trim() + '</option>');
    options.forEach(option => {
        select.append(`<option value="${option}">${option}</option>`);
    });
}

// Load analytics data from backend
function loadAnalyticsData() {
    console.log('=== LOADING ANALYTICS DATA ===');
    $.get('/analytics', function(data) {
        console.log('=== ANALYTICS DATA RECEIVED ===');
        console.log('Success:', data.success);
        console.log('Data keys:', Object.keys(data));
        
        if (data.success) {
            console.log('KPI Metrics:', data.kpi_metrics);
            console.log('Monthly Sales:', data.monthly_sales);
            console.log('Product Revenue:', data.product_revenue);
            console.log('Category Performance:', data.category_performance);
            console.log('Region Sales:', data.region_sales);
            console.log('Sales Distribution:', data.sales_distribution);
            console.log('Revenue Growth:', data.revenue_growth);
            console.log('Recent Transactions:', data.recent_transactions);
            
            updateKPIs(data.kpi_metrics);
            initializeCharts(data);
            initializeDataTable(data.recent_transactions);
        } else {
            console.error('Analytics API returned error:', data.error);
            alert('Error loading analytics: ' + data.error);
        }
    }).fail(function(error) {
        console.error('=== ANALYTICS LOAD ERROR ===');
        console.error('Error:', error);
        console.error('Status:', error.status);
        console.error('Response:', error.responseText);
        alert('Failed to load analytics data. Please check console for details.');
    });
}

// Update KPI cards
function updateKPIs(kpiData) {
    $('#totalSales').text(formatIndianCurrency(kpiData.total_sales));
    $('#totalOrders').text(formatNumber(kpiData.total_orders));
    $('#averageSales').text(formatIndianCurrency(kpiData.average_sales));
    $('#highestSale').text(formatIndianCurrency(kpiData.highest_sale));
}

// Initialize all charts
function initializeCharts(data) {
    const chartColors = {
        primary: 'rgba(79, 70, 229, 0.8)',
        primaryLight: 'rgba(79, 70, 229, 0.2)',
        secondary: 'rgba(124, 58, 237, 0.8)',
        secondaryLight: 'rgba(124, 58, 237, 0.2)',
        success: 'rgba(16, 185, 129, 0.8)',
        successLight: 'rgba(16, 185, 129, 0.2)',
        warning: 'rgba(245, 158, 11, 0.8)',
        warningLight: 'rgba(245, 158, 11, 0.2)',
        danger: 'rgba(239, 68, 68, 0.8)',
        dangerLight: 'rgba(239, 68, 68, 0.2)',
        info: 'rgba(59, 130, 246, 0.8)',
        infoLight: 'rgba(59, 130, 246, 0.2)'
    };

    // Monthly Sales Trend Chart
    const monthlyCtx = document.getElementById('monthlySalesChart').getContext('2d');
    monthlySalesChart = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: data.monthly_sales.labels,
            datasets: [{
                label: 'Monthly Sales',
                data: data.monthly_sales.values,
                borderColor: chartColors.primary,
                backgroundColor: chartColors.primaryLight,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // Category Performance Chart
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: data.category_performance.labels,
            datasets: [{
                data: data.category_performance.values,
                backgroundColor: [
                    chartColors.primary,
                    chartColors.secondary,
                    chartColors.success,
                    chartColors.warning,
                    chartColors.info
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${formatCurrency(context.raw)} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });

    // Product Wise Revenue Chart
    const productCtx = document.getElementById('productChart').getContext('2d');
    productChart = new Chart(productCtx, {
        type: 'bar',
        data: {
            labels: data.product_revenue.labels,
            datasets: [{
                label: 'Revenue',
                data: data.product_revenue.values,
                backgroundColor: chartColors.primary,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // Region Wise Sales Chart
    const regionCtx = document.getElementById('regionChart').getContext('2d');
    regionChart = new Chart(regionCtx, {
        type: 'polarArea',
        data: {
            labels: data.region_sales.labels,
            datasets: [{
                data: data.region_sales.values,
                backgroundColor: [
                    chartColors.primaryLight,
                    chartColors.secondaryLight,
                    chartColors.successLight,
                    chartColors.warningLight
                ],
                borderColor: [
                    chartColors.primary,
                    chartColors.secondary,
                    chartColors.success,
                    chartColors.warning
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });

    // Sales Distribution Chart
    const distributionCtx = document.getElementById('distributionChart').getContext('2d');
    distributionChart = new Chart(distributionCtx, {
        type: 'pie',
        data: {
            labels: data.sales_distribution.labels,
            datasets: [{
                data: data.sales_distribution.values,
                backgroundColor: [
                    chartColors.primary,
                    chartColors.secondary,
                    chartColors.success,
                    chartColors.warning,
                    chartColors.info
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${formatCurrency(context.raw)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Revenue Growth Chart
    const growthCtx = document.getElementById('growthChart').getContext('2d');
    growthChart = new Chart(growthCtx, {
        type: 'line',
        data: {
            labels: data.revenue_growth.labels.slice(-20),
            datasets: [{
                label: 'Cumulative Revenue',
                data: data.revenue_growth.values.slice(-20),
                borderColor: chartColors.success,
                backgroundColor: chartColors.successLight,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: chartColors.success,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                }
            }
        }
    });
}

// Initialize DataTable
function initializeDataTable(transactions) {
    const tableBody = $('#transactionsBody');
    tableBody.empty();

    transactions.forEach(transaction => {
        const row = `
            <tr>
                <td>${transaction.Order_ID}</td>
                <td>${formatDate(transaction.Date)}</td>
                <td>${transaction.Product}</td>
                <td>${transaction.Category}</td>
                <td>${transaction.Region}</td>
                <td>${transaction.Quantity_Sold}</td>
                <td>${formatCurrency(transaction.Unit_Price)}</td>
                <td>${transaction.Discount}%</td>
                <td><strong>${formatCurrency(transaction.Sales)}</strong></td>
            </tr>
        `;
        tableBody.append(row);
    });

    // Initialize DataTables plugin
    dataTable = $('#transactionsTable').DataTable({
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        order: [[0, 'asc']],  // Sort by Order_ID (column 0) in ascending order
        language: {
            search: '_INPUT_',
            searchPlaceholder: 'Search transactions...'
        },
        dom: '<"top"lf>rt<"bottom"ip><"clear">'
    });
}

// Initialize event listeners
function initializeEventListeners() {
    // Prediction form submission
    $('#predictionForm').on('submit', function(e) {
        e.preventDefault();
        handlePrediction();
    });

    // Global search functionality
    $('#globalSearch').on('keyup', function() {
        const searchTerm = $(this).val().toLowerCase();
        
        // Search in transactions table
        if (dataTable) {
            dataTable.search(searchTerm).draw();
        }
        
        // Search in page content
        searchPageContent(searchTerm);
    });

    // Table search
    $('#tableSearch').on('keyup', function() {
        dataTable.search($(this).val()).draw();
    });

    // Smooth scrolling for navigation links
    $('a[href^="#"]').on('click', function(e) {
        const target = $(this.getAttribute('href'));
        if (target.length) {
            e.preventDefault();
            const headerHeight = $('.top-header').outerHeight();
            const targetPosition = target.offset().top - headerHeight;
            $('html, body').animate({
                scrollTop: targetPosition
            }, 800);
        }
    });
}

// Handle sales prediction
function handlePrediction() {
    const formData = {
        product: $('#product').val(),
        category: $('#category').val(),
        region: $('#region').val(),
        quantity_sold: $('#quantitySold').val(),
        unit_price: $('#unitPrice').val(),
        discount: $('#discount').val(),
        date: $('#date').val()
    };

    console.log('=== PREDICTION REQUEST ===');
    console.log('Form Data:', formData);
    console.log('Product:', formData.product);
    console.log('Category:', formData.category);
    console.log('Region:', formData.region);
    console.log('Quantity Sold:', formData.quantity_sold);
    console.log('Unit Price:', formData.unit_price);
    console.log('Discount:', formData.discount);
    console.log('Date:', formData.date);

    // Validate form
    if (!formData.product || !formData.category || !formData.region || 
        !formData.quantity_sold || !formData.unit_price || 
        !formData.date) {
        alert('Please fill in all required fields.');
        return;
    }

    // Show loading state
    const submitBtn = $('#predictionForm button[type="submit"]');
    const originalText = submitBtn.html();
    submitBtn.html('<i class="fas fa-spinner fa-spin"></i> Processing...');
    submitBtn.prop('disabled', true);

    // Make API call
    $.ajax({
        url: '/predict',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function(response) {
            console.log('=== PREDICTION RESPONSE ===');
            console.log('Response:', response);
            if (response.success) {
                displayPredictionResult(response);
            } else {
                alert('Error: ' + response.error);
            }
        },
        error: function(error) {
            console.error('=== PREDICTION ERROR ===');
            console.error('Error:', error);
            console.error('Status:', error.status);
            console.error('Response:', error.responseText);
            alert('An error occurred while processing your request.');
        },
        complete: function() {
            submitBtn.html(originalText);
            submitBtn.prop('disabled', false);
        }
    });
}

// Display prediction result
function displayPredictionResult(response) {
    console.log('=== DISPLAYING PREDICTION RESULT ===');
    console.log('Response:', response);
    console.log('Predicted Sales:', response.predicted_sales);
    console.log('Confidence:', response.confidence);
    console.log('Forecast Summary:', response.forecast_summary);
    
    $('#predictionPlaceholder').hide();
    $('#predictionResult').fadeIn();

    $('#predictedRevenue').text(formatCurrency(response.predicted_sales));
    $('#confidenceLevel').text(response.confidence + '%');
    $('#forecastSummary').text(response.forecast_summary);

    // Scroll to result
    $('html, body').animate({
        scrollTop: $('#predictionResult').offset().top - 100
    }, 500);
}

// Initialize sidebar toggle
function initializeSidebar() {
    $('#menuToggle').on('click', function() {
        $('.sidebar').toggleClass('active');
    });

    // Close sidebar when clicking outside on mobile
    $(document).on('click', function(e) {
        if ($(window).width() <= 992) {
            if (!$(e.target).closest('.sidebar').length && 
                !$(e.target).closest('#menuToggle').length) {
                $('.sidebar').removeClass('active');
            }
        }
    });

    // Active menu item highlighting
    $('.menu-link').on('click', function() {
        $('.menu-item').removeClass('active');
        $(this).closest('.menu-item').addClass('active');
    });

    // Scroll spy for navigation
    $(window).on('scroll', function() {
        const scrollPosition = $(window).scrollTop();
        const headerHeight = $('.top-header').outerHeight();

        $('section').each(function() {
            const sectionTop = $(this).offset().top - headerHeight - 20;
            const sectionHeight = $(this).outerHeight();
            const sectionId = $(this).attr('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                $('.menu-item').removeClass('active');
                $(`a[href="#${sectionId}"]`).closest('.menu-item').addClass('active');
            }
        });
    });
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    $('#date').val(today);
}

// Utility functions
function formatCurrency(value) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Format Indian currency in Lakhs/Crores
function formatIndianCurrency(value) {
    if (value >= 10000000) {
        // Crores (1 Crore = 10,000,000)
        const crores = value / 10000000;
        return `₹${crores.toFixed(2)} Cr`;
    } else if (value >= 100000) {
        // Lakhs (1 Lakh = 100,000)
        const lakhs = value / 100000;
        return `₹${lakhs.toFixed(2)} Lakh`;
    } else if (value >= 1000) {
        // Thousands
        const thousands = value / 1000;
        return `₹${thousands.toFixed(2)} K`;
    } else {
        // Small values
        return `₹${value.toFixed(2)}`;
    }
}

// Search page content
function searchPageContent(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
        // Reset all highlights
        $('.highlighted').removeClass('highlighted');
        return;
    }
    
    // Remove previous highlights
    $('.highlighted').removeClass('highlighted');
    
    // Scroll to transactions section
    const transactionsSection = $('#reports');
    if (transactionsSection.length) {
        $('html, body').animate({
            scrollTop: transactionsSection.offset().top - 100
        }, 500);
    }
    
    // Search in text content
    $('section').each(function() {
        const section = $(this);
        const text = section.text().toLowerCase();
        
        if (text.includes(searchTerm)) {
            section.show();
        }
    });
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Handle window resize for charts
$(window).on('resize', function() {
    if (monthlySalesChart) monthlySalesChart.resize();
    if (categoryChart) categoryChart.resize();
    if (productChart) productChart.resize();
    if (regionChart) regionChart.resize();
    if (distributionChart) distributionChart.resize();
    if (growthChart) growthChart.resize();
});
