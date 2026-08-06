pipeline {
    agent any

    environment {
        COMPOSE_CMD = 'docker-compose'
        COMPOSE_FILE = 'docker-compose.yml'
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Validate Env File') {
            steps {
                sh 'cd "$WORKSPACE" && test -f .env || cp .env.example .env'
            }
        }

        stage('Validate Compose File') {
            steps {
                sh 'cd "$WORKSPACE" && pwd && ls -la && test -f ${COMPOSE_FILE}'
            }
        }

        stage('Stop Existing Containers') {
            steps {
                sh 'cd "$WORKSPACE" && ${COMPOSE_CMD} -f ${COMPOSE_FILE} down || true'
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'cd "$WORKSPACE" && ${COMPOSE_CMD} -f ${COMPOSE_FILE} config'
                sh 'cd "$WORKSPACE" && ${COMPOSE_CMD} -f ${COMPOSE_FILE} build --no-cache'
            }
        }

        stage('Deploy') {
            steps {
                sh 'cd "$WORKSPACE" && ${COMPOSE_CMD} -f ${COMPOSE_FILE} up -d'
            }
        }

        stage('Verify') {
            steps {
                sh 'cd "$WORKSPACE" && ${COMPOSE_CMD} -f ${COMPOSE_FILE} ps'
            }
        }
    }
}
