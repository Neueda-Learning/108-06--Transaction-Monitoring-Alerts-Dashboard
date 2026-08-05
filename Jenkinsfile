pipeline {
    agent any

    triggers {
        // Assumes a webhook (or SCM polling) is configured on the Jenkins job
        // to fire on pushes/merges to main.
        pollSCM('')
    }

    environment {
        DB_PASSWORD = credentials('transaction-monitoring-db-password')
        GEMINI_API_KEY = credentials('transaction-monitoring-gemini-api-key')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend: Test') {
            steps {
                sh './mvnw -B clean test'
            }
        }

        stage('Backend: Build') {
            steps {
                sh './mvnw -B package -DskipTests'
            }
        }

        stage('Frontend: Install & Test') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npx tsc -b --noEmit'
                    sh 'npm run test'
                }
            }
        }

        stage('Frontend: Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Docker: Build Images') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh 'docker compose up -d'
            }
        }
    }

    post {
        always {
            junit testResults: 'target/surefire-reports/*.xml', allowEmptyResults: true
        }
        failure {
            echo 'Pipeline failed - check console output for details.'
        }
    }
}
