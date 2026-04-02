library(shiny)
library(shinyvalidate)
library(tidyverse)
library(shinydisconnect)
library(dplyr)
library(fontawesome)
library(DT)

id <- "1aS6l4KAXX7iuvSSfA6OlkYIlC_eF3POd"
dataset <- read_csv(sprintf("https://docs.google.com/uc?id=%s&export=download", id))
dataset <- dataset[-1]
dataset$maxcrew <- round(625 - dataset$weight, digits = 2)

ui <- fluidPage(
  disconnectMessage(
    text = "App Disconnected - Please refresh the page and try again. If the error persists, contact Brad.",
    refresh = "Refresh",
    background = "#FFFFFF",
    colour = "#444444",
    refreshColour = "#337AB7",
    overlayColour = "#000000",
    overlayOpacity = 0.6,
    width = "full",
    top = "center",
    size = 22,
    css = ""
  ),
  
  titlePanel(""),
  sidebarLayout(
    sidebarPanel(
      style = "text-align: center;",
      uiOutput("images"),
      br(),
      radioButtons(
        "mode",
        "Mode",
        choices = c("Single Passenger" = "single", "Multiple Passengers" = "multi"),
        selected = "single",
        inline = TRUE
      ),
      conditionalPanel(
        condition = "input.mode == 'single'",
        selectInput("aircraft", "Aircraft", sort(unique(dataset$aircraft))),
        numericInput("commander", HTML(
          paste0(
            "Aircraft Commander ",
            "<span style=\"text-decoration:underline\">(WITH parachute)</span>"
          )
        ), 0, 0, 120, 1),
        numericInput("passenger", HTML(
          paste0(
            "Passenger ",
            "<span style=\"text-decoration:underline\">(WITH parachute)</span>"
          )
        ), 0, 0, 120, 1),
        selectInput("ballast", "Ballast Weights", c(
          "None" = 0,
          "One" = 7,
          "Two" = 15
        ))
      ),
      br(),
      p(
        style = "font-size: 0.85em;",
        "Created by ",
        a("Flt Lt B Kennedy", href = "mailto:bradley.kennedy100@rafac.mod.gov.uk", target =
            "_blank"),
        "for 2 FTS",
        br(),
        br(),
        a("Source Code", href = "https://github.com/b-kennedy0/2FTS-BallastWeight", target =
            "_blank"),
        "|" ,
        a("Add new aircraft", href = "https://docs.google.com/forms/d/e/1FAIpQLSdZUL2xQoC6--gYshqy-mRN6uogpsxnZMvVtqh0qOgCmbNavg/viewform?usp=sf_link", target = "_blank")
      )
    ),
    
    mainPanel(
      tags$style(".fa-check-circle {color:#008000}"),
      tags$style(".fa-times-circle {color:#FF0000}"),
      tags$style(".fa-exclamation-circle {color:#FFA500}"),
      tags$style(
        ".pax-row {display:flex; flex-wrap:wrap; margin-bottom:8px;}\
        .pax-row > .pax-col {flex:0 0 50%; max-width:50%; padding-left:15px; padding-right:15px;}\
        .pax-head {display:flex; flex-wrap:wrap; margin-bottom:6px; font-weight:600;}\
        .pax-head .pax-col {flex:0 0 50%; max-width:50%; padding-left:15px; padding-right:15px;}\
        @media (max-width: 767px) {\
          .pax-row {flex-wrap:nowrap; align-items:flex-end;}\
          .pax-row > .pax-col {flex:1 1 auto; max-width:none;}\
          .pax-row > .pax-col.pax-weight {flex:0 0 120px; max-width:120px;}\
          .pax-head .pax-col {flex:1 1 auto; max-width:none;}\
          .pax-head .pax-col.pax-weight {flex:0 0 120px; max-width:120px;}\
          .pax-row input[type='number'] {width:120px;}\
        }"
      ),
      tags$style(
        "@import url(https://use.fontawesome.com/releases/v5.7.2/css/all.css);"
      ),
      tabsetPanel(
        id = "mode_tabs",
        type = "hidden",
        tabPanel(
          "Single Passenger",
          tags$h3(HTML(as.character(icon(
            "lightbulb"
          )), " Assumptions")),
          HTML(
            "<ul><li>Aircraft Commander in the rear seat</li><li>Passenger in the front seat</li><li>Nil carry-on items</li></ul>"
          ),
          HTML("<hr>"),
          column(
            5,
            tags$h3(HTML(as.character(icon(
              "calculator"
            )), " Calculations")),
            htmlOutput("commander"),
            htmlOutput("passenger"),
            textOutput("ballast_weight"),
            "------",
            textOutput("combined_crew"),
            "------",
            textOutput("air_weight"),
            textOutput("totalaum"),
          ),
          column(
            5,
            tags$h3(HTML(as.character(
              icon("clipboard-check")
            ), " Output")),
            htmlOutput("aumlimit"),
            htmlOutput("frontseat"),
            htmlOutput("ballast"),
            br(),
            htmlOutput("approachspeed")
          ),
          column(10, HTML("<hr>"), tags$h3(
            HTML(as.character(icon("plane")), " Alternative aircraft")
          ), DTOutput("alt_aircraft"))
        ),
        tabPanel(
          "Multiple Passengers",
          tags$h3(HTML(as.character(icon("users")), " Passenger list")),
          numericInput(
            "num_pax",
            "Number of passengers",
            value = 10,
            min = 1,
            max = 50,
            step = 1
          ),
          tags$div(
            class = "pax-head",
            tags$div(class = "pax-col pax-name", "Name"),
            tags$div(class = "pax-col pax-weight", "Weight WITH Parachute")
          ),
          uiOutput("multi_passenger_inputs"),
          tags$div(
            style = "margin: 12px 0;",
            downloadButton("save_summary", "Save Summary", class = "btn-success"),
            actionButton("reset_multi", "Reset", class = "btn-default", style = "margin-left: 8px;")
          ),
          HTML("<hr>"),
          tags$h3(HTML(as.character(icon("clipboard-check")),
                       " Passenger ballast summary")),
          DTOutput("ballast_table")
        )
      )
    )
  )
)

server <- function(input, output, session) {
  iv <- InputValidator$new()
  iv$add_rule("commander", sv_between(0, 120))
  iv$add_rule("passenger", sv_between(0, 120))
  iv$enable()
  
  observeEvent(input$mode, {
    updateTabsetPanel(
      session,
      "mode_tabs",
      selected = if (input$mode == "single") "Single Passenger" else "Multiple Passengers"
    )
  })

  observeEvent(input$reset_multi, {
    updateNumericInput(session, "num_pax", value = 10)
    lapply(1:10, function(i) {
      updateTextInput(session, paste0("pax_name_", i), value = paste0("Pax", i))
      updateNumericInput(session, paste0("pax_weight_", i), value = 0)
    })
  })
  
  ballast_summary <- function(weight) {
    if (is.na(weight) || weight <= 0) {
      return(list(required = "", permitted = "", status = "No weight entered"))
    }
    if (weight < 42) {
      return(list(
        required = "N/A",
        permitted = "0",
        status = "Passenger too light to fly"
      ))
    }
    if (weight < 55) {
      return(list(
        required = "N/A",
        permitted = "N/A",
        status = "Rear seat only"
      ))
    }
    if (weight < 64) {
      return(list(
        required = "2",
        permitted = "2",
        status = "Two ballast weights must be fitted"
      ))
    }
    if (weight < 70) {
      return(list(
        required = "At least 1",
        permitted = "1 or 2",
        status = "At least one ballast weight must be fitted"
      ))
    }
    if (weight < 96) {
      return(list(
        required = "0",
        permitted = "0, 1, or 2",
        status = "Ballast not required"
      ))
    }
    if (weight < 104) {
      return(list(
        required = "0",
        permitted = "0 or 1",
        status = "Ballast not required"
      ))
    }
    if (weight < 111) {
      return(list(
        required = "0",
        permitted = "0",
        status = "Ballast not permitted"
      ))
    }
    return(list(
      required = "N/A",
      permitted = "0",
      status = "Passenger too heavy to fly"
    ))
  }
  
  passenger_summary_df <- function() {
    pax_count <- input$num_pax
    if (is.null(pax_count) || pax_count < 1) pax_count <- 1
    pax_count <- min(pax_count, 50)
    
    passengers <- lapply(1:pax_count, function(i) {
      name <- input[[paste0("pax_name_", i)]]
      weight <- input[[paste0("pax_weight_", i)]]
      summary <- ballast_summary(weight)
      data.frame(
        Passenger = if (is.null(name) || name == "") paste0("Pax", i) else name,
        Weight_kg = weight,
        Required_Ballast = summary$required,
        Permitted_Ballast = summary$permitted,
        Notes = summary$status,
        stringsAsFactors = FALSE
      )
    })
    
    bind_rows(passengers)
  }
  
  output$images <- renderUI({
    tags$div(
      img(
        src = "2FTS KC.png",
        width = 80,
        height = 100,
        style = "float:left;"
      ),
      br(),
      h4("Ballast Weight App"),
      helpText(
        "For information only.",
        br(),
        "Responsibility remains with the Aircraft Commander"
      )
    )
  })
  
  output$commander <- renderText({
    commander <- input$commander
    
    if (commander > 110) {
      return(
        paste(
          "<span style=\"color:red\">AIRCRAFT COMMANDER OVERWEIGHT = ",
          commander,
          "kg ",
          "</span>",
          tags$p(fa("times-circle", fill = "#FF0000"))
        )
      )
    }  else{
      print(paste0("Commander (with para) = ", commander, "kg"))
    }
  })
  
  output$passenger <- renderText({
    passenger <- input$passenger
    
    if (passenger > 110) {
      return(
        paste(
          "<span style=\"color:red\">PASSENGER OVERWEIGHT = ",
          passenger,
          "kg ",
          "</span>",
          tags$p(fa("times-circle", fill = "#FF0000"))
        )
      )
    } else{
      print(paste0("Passenger (with para) = ", passenger, "kg"))
    }
  })
  
  output$combined_crew <- renderText({
    commander <- input$commander
    passenger <- input$passenger
    ballast <- as.numeric(input$ballast)
    combined <- commander + passenger + ballast
    print(paste0("Total Payload = ", combined, "kg"))
  })
  
  output$ballast_weight <- renderText({
    ballast <- input$ballast
    print(paste0("Ballast weight = ", ballast, "kg"))
  })
  
  output$air_weight <- renderText({
    aircraft <- dataset$weight[dataset$aircraft == input$aircraft]
    print(paste0("Aircraft weight = ", round(aircraft, digits = 2), "kg"))
  })
  
  output$totalaum <- renderText({
    commander <- input$commander
    passenger <- input$passenger
    aircraft <- dataset$weight[dataset$aircraft == input$aircraft]
    ballast <- as.numeric(input$ballast)
    
    AUM <- commander + passenger + aircraft + ballast
    
    print(paste0("Aircraft All-Up-Mass = ", round(AUM, digits = 2), "kg"))
  })
  
  output$aumlimit <- renderText({
    commander <- input$commander
    passenger <- input$passenger
    aircraft <- dataset$weight[dataset$aircraft == input$aircraft]
    ballast <- as.numeric(input$ballast)
    
    AUM <- commander + passenger + aircraft + ballast
    
    aumlimit <- if (AUM < 625) {
      HTML(paste0(
        fa("check-circle", fill = "#008000"),
        "Aircraft All-Up-Mass Limits OK"
      ))
    }  else {
      return(
        paste0((fa("times-circle", fill = "#FF0000")),
               "<span style=\"color:red\">Aircraft All-Up-Mass Limits EXCEEDED </span>"
        )
      )
    }
  })
  
  output$frontseat <- renderText({
    passenger <- input$passenger
    
    min_front <- if (passenger < 55) {
      return(paste0((fa("times-circle", fill = "#FF0000")),
                    "<span style=\"color:red\">Front seat minimum weight NOT met </span>"
      ))
    } else {
      HTML(paste0((
        fa("check-circle", fill = "#008000")
      ), "Front seat minimum weight OK"))
    }
  })
  
  output$ballast <- renderText({
    passenger <- input$passenger
    
    ballast_weights <- if (passenger < 42) {
      return(paste0((fa("times-circle", fill = "#FF0000")),
                    "<span style=\"color:red\">PASSENGER TOO LIGHT TO FLY </span>"
      ))
    } else if (passenger < 55) {
      return(paste0((fa(
        "exclamation-circle", fill = "#FFA500"
      )),
      "<span style=\"color:orange\">PASSENGER IN REAR SEAT ONLY </span>"
      ))
    } else if (passenger < 64) {
      return(
        paste0((fa(
          "exclamation-circle", fill = "#FFA500"
        )),
        "<span style=\"color:orange\">TWO Ballast weights MUST be fitted </span>"
        )
      )
    } else if (passenger < 70) {
      return(
        paste0((fa(
          "exclamation-circle", fill = "#FFA500"
        )),
        "<span style=\"color:orange\">at least ONE Ballast weight MUST be fitted </span>"
        )
      )
    } else if (passenger < 96) {
      print(paste0((
        fa("check-circle", fill = "#008000")
      ), "Ballast not required, but 1 or 2 may be fitted"))
    } else if (passenger < 104) {
      print(paste0((
        fa("check-circle", fill = "#008000")
      ), "Ballast not required, but 1 may be fitted"))
    } else if (passenger < 111) {
      print(
        paste0((fa("check-circle", fill = "#FF0000")),
               "<span style=\"color:red\">Ballast weights are NOT PERMITTED</span>"
        )
      )
    } else
      return(paste0((fa("times-circle", fill = "#FF0000")),
                    "<span style=\"color:red\">PASSENGER TOO HEAVY TO FLY</span>"
      ))
  })
  
  output$approachspeed <- renderText({
    commander <- input$commander
    passenger <- input$passenger
    aircraft <- dataset$weight[dataset$aircraft == input$aircraft]
    ballast <- as.numeric(input$ballast)
    
    AUM <- commander + passenger + aircraft + ballast
    
    if (AUM < 580) {
      HTML(fa("info-circle"), "Approach speed 55kts")
    } else {
      HTML(fa("info-circle"), "Approach speed 60kts")
    }
  })
  
  output$alt_aircraft <- renderDT({
    commander <- input$commander
    passenger <- input$passenger
    ballast <- as.numeric(input$ballast)
    
    combined <- commander + passenger + ballast
    dataset <- mutate(dataset, overweight = if_else(maxcrew < combined, "TRUE", "FALSE"))
    colnames(dataset) = c("Tail No", "A/C Weight", "Max Payload", "Overweight?")
    datatable(dataset[order(dataset$"Tail No"), ]) %>% 
      formatStyle(
        'Overweight?', target = 'cell', 
        backgroundColor = styleEqual(c("TRUE", "FALSE"), c('lightcoral', 'lightgreen'))
      )
  })
  
  output$ballast_table <- renderDT({
    passenger_df <- passenger_summary_df()
    datatable(
      passenger_df,
      rownames = FALSE,
      options = list(
        paging = FALSE,
        searching = FALSE,
        info = FALSE
      )
    )
  })
  
  output$save_summary <- downloadHandler(
    filename = function() {
      paste0("ballast_summary_", Sys.Date(), ".pdf")
    },
    content = function(file) {
      if (!requireNamespace("gridExtra", quietly = TRUE)) {
        stop("Missing package 'gridExtra'. Please install it with install.packages('gridExtra').")
      }
      passenger_df <- passenger_summary_df()
      grDevices::pdf(file, width = 11, height = 8.5)
      grid::grid.newpage()
      grid::grid.text(
        paste("Passenger Ballast Summary -", format(Sys.Date(), "%d %b %y")),
        x = 0.5,
        y = 0.97,
        gp = grid::gpar(fontsize = 14, fontface = "bold")
      )
      gridExtra::grid.table(passenger_df, rows = NULL)
      grDevices::dev.off()
    }
  )
  
  output$multi_passenger_inputs <- renderUI({
    pax_count <- input$num_pax
    if (is.null(pax_count) || pax_count < 1) pax_count <- 1
    pax_count <- min(pax_count, 50)
    
    tagList(
      lapply(1:pax_count, function(i) {
        tags$div(
          class = "pax-row",
          tags$div(
            class = "pax-col pax-name",
            textInput(
              inputId = paste0("pax_name_", i),
              label = NULL,
              value = paste0("Pax", i)
            )
          ),
          tags$div(
            class = "pax-col pax-weight",
            numericInput(
              inputId = paste0("pax_weight_", i),
              label = NULL,
              value = 0,
              min = 0,
              max = 120,
              step = 1
            )
          )
        )
      })
    )
  })
  
}

# Run the application
shinyApp(ui = ui, server = server)
