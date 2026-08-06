pipeline {
    agent any

    environment {
        COMPOSE_CMD = 'docker-compose'
        COMPOSE_FILE = 'docker-compose.yml'
        GEMINI_API_KEY = credentials('GEMINI_API_KEY')
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Create Env File') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    echo "GEMINI_API_KEY=$GEMINI_API_KEY" > .env

                    echo "Environment file created"
                    cat .env | sed 's/GEMINI_API_KEY=.*/GEMINI_API_KEY=***masked***/'
                '''
            }
        }

        stage('Validate Compose File') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    pwd
                    ls -la

                    test -f ${COMPOSE_FILE}
                '''
            }
        }

        stage('Stop Existing Containers') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    ${COMPOSE_CMD} -f ${COMPOSE_FILE} down || true
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    echo "Checking Docker Compose configuration:"
                    ${COMPOSE_CMD} -f ${COMPOSE_FILE} config | grep GEMINI_API_KEY || true

                    ${COMPOSE_CMD} -f ${COMPOSE_FILE} build --no-cache
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    ${COMPOSE_CMD} -f ${COMPOSE_FILE} up -d
                '''
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    cd "$WORKSPACE"

                    ${COMPOSE_CMD} -f ${COMPOSE_FILE} ps
                '''
            }
        }
    }

    post {
        always {
            sh '''
                rm -f "$WORKSPACE/.env"
            '''
        }
    }
}