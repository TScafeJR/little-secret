PROJECT_ID="pro-juice"
REPOSITORY="ollama"
IMAGE="ollama-deepseek"
OLLAMA_IDENTITY="ollama-identity"
TAG="latest"

create_registry(){
	gcloud artifacts repositories create $REPOSITORY \
		--repository-format=docker \
		--location=us-central1
}

build_image(){
	gcloud builds submit \
		--config=cloudbuild.yaml \
		--machine-type e2-highcpu-32
}

create_service_account(){
	gcloud iam service-accounts create $OLLAMA_IDENTITY \
		--display-name="Service Account for Ollama Cloud Run service"
}

deploy(){
	gcloud beta run deploy $IMAGE \
		--image "gcr.io/$PROJECT_ID/$REPOSITORY/$IMAGE:$TAG" \
		--concurrency 4 \
		--cpu 8 \
		--set-env-vars OLLAMA_NUM_PARALLEL=4 \
		--gpu 1 \
		--gpu-type nvidia-l4 \
		--max-instances 7 \
		--memory 32Gi \
		--no-allow-unauthenticated \
		--no-cpu-throttling \
		--service-account "$OLLAMA_IDENTITY@$PROJECT_ID.iam.gserviceaccount.com" \
		--timeout=600
}

update(){
	build_image
	deploy
}

quota(){
	gcloud beta quotas preferences create \
		--preferred-value=2 \
		--dimensions=region="us-central1" \
		--project="pro-juice" \
		--quota-id="NvidiaL4GpuAllocPerProjectRegion" \
		--service="run.googleapis.com" \
		--billing-project="pro-juice" \
		--email="tydev515@gmail.com" \
		--justification="building out llm model"
}

"$@"
